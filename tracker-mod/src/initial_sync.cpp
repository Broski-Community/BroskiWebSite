/**
 * Tracker_Mod — Geode-dependent Initial_Sync orchestration (implementation).
 *
 * This translation unit includes the Geode SDK (`web::WebRequest`, `Loader`,
 * notifications), so it can only be compiled on a machine with `GEODE_SDK`
 * configured. It is excluded from the pure-logic test build
 * (-DTRACKER_BUILD_TESTS=ON), which compiles only the standard-library-only
 * headers under include/tracker/.
 *
 * Pipeline (design "Geode Hook Strategy, Phase 1" + "Networking"):
 *   MenuLayer::init  --(main thread, O(1))-->  runInitialSync()
 *     1. session guard + token read           (main thread, cheap; Req 3.1)
 *     2. read local completions               (worker thread; Req 1.1)
 *     3. filter + serialize into batches       (worker thread; Req 1.3, 1.4)
 *     4. POST each batch with X-Player-Token    (web::WebRequest, background;
 *                                               Req 1.5, 4.4)
 *     5. set initial_sync_done iff every batch  (Req 1.6) else leave unset
 *        returned HTTP 200 within 30 s          (Req 1.8)
 *
 * Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 3.1, 4.4, 4.5.
 */
#include "initial_sync.hpp"

#include <chrono>
#include <memory>
#include <string>
#include <thread>
#include <utility>
#include <vector>

#include <Geode/Geode.hpp>
#include <Geode/utils/web.hpp>

#include <tracker/completion_filter.h>
#include <tracker/initial_sync.h>
#include <tracker/serialization.h>

#include "completion_reader.hpp"
#include "networking.hpp"
#include "session_state.hpp"
#include "token_setting.hpp"

using namespace geode::prelude;

namespace tracker {

namespace {

// The single per-session sync state. Owned here for the lifetime of the process;
// all access happens on the main thread (the dispatch decision) or is marshalled
// back to it from the worker thread via Loader::queueInMainThread.
SyncSession s_session;

// Guards against dispatching more than once per launch. The hook may fire
// MenuLayer::init multiple times (returning to the main menu), but Initial_Sync
// must run at most once per session.
bool s_dispatched = false;

// Reads + filters + batches local completions OFF the main thread, then POSTs
// each batch synchronously (still off the main thread). web::WebTask's callback
// model was removed in Geode v5, so we use the synchronous postSync API on this
// worker thread and marshal the session-flag updates back to the main thread.
// Keeping all of this off-thread honors Req 3.1.
void readAndUpload(std::string token) {
    std::thread([token = std::move(token)]() mutable {
        // GD-dependent read of every locally stored demon completion (Req 1.1).
        std::vector<RawCompletion> raw = readLocalCompletions();

        // Diagnostic: how many raw demon completions were read from the local
        // save before filtering. A value of 0 here means the reader found nothing
        // (e.g. no cached demon levels), which would upload "[]" and store nothing.
        log::info("Demon Tier Tracker: read {} raw local demon completion(s).",
                  raw.size());

        // Drop entries missing fields or out of range; keep the valid set (Req 1.3).
        FilterResult filtered = filterCompletions(raw);

        // Serialize into upload-ready batches of <=1000 records and <=64 KB
        // (Req 1.4, 6.2, 10.4).
        std::vector<std::string> batches =
            chunkCompletionsSerialized(filtered.valid);

        // Req 1.4: an empty completion set is still uploaded as a single empty
        // array so the server observes a completed sync. chunkCompletionsSerialized
        // yields no batches for an empty input, so synthesize the "[]" body.
        if (batches.empty()) {
            batches.push_back("[]");
        }

        log::info(
            "Demon Tier Tracker: Initial Sync uploading {} valid completion(s) "
            "({} skipped) in {} batch(es).",
            filtered.valid.size(), filtered.skipped, batches.size());

        // POST every batch sequentially. The session flag is set ONLY if every
        // batch returns HTTP 200 within the 30 s timeout (Req 1.6); any non-200,
        // transport error, or timeout marks failure and leaves the flag unset so
        // the sync is retried next launch (Req 1.8, 3.4).
        bool allSucceeded = true;
        for (std::size_t i = 0; i < batches.size(); ++i) {
            web::WebRequest request;
            request.header(kPlayerTokenHeader, token);        // Req 4.4
            request.header("Content-Type", "application/json");
            request.bodyString(batches[i]);
            // Wait up to 30 s for a response (Req 1.5, 1.6, 3.3).
            request.timeout(std::chrono::seconds(kSyncRequestTimeoutSeconds));

            const web::WebResponse response = request.postSync(kRecordsApiUrl);
            const int status = response.code();
            if (!isSyncSuccessStatus(status)) {               // Req 1.6
                // Diagnostic: include the server's response body so we can tell
                // apart a 401 (token), a 400 unknown_level (a demon not in the
                // allow-list), a 413 (too big), or a 503 (auth timeout).
                const std::string body = response.string().unwrapOr(std::string{});
                log::warn(
                    "Demon Tier Tracker: Initial Sync batch {} failed (HTTP {}); "
                    "response: {}; will retry next launch.",
                    i, status, body);
                allSucceeded = false;
                break;
            }
        }

        const std::size_t batchCount = batches.size();

        // Apply the result on the main thread, where the session flag and the
        // retry-queue flush are serialized with the gameplay hooks.
        Loader::get()->queueInMainThread([allSucceeded, batchCount]() {
            if (allSucceeded) {
                s_session.markSucceeded();
                // Unlock Live_Tracking for this session: the shared flag in
                // session_state.hpp is the one live_tracking.cpp reads to decide
                // whether to submit (Req 1.6, 2.1, 2.5).
                setInitialSyncDone(true);
                // Flush any Records queued in a previous session whose POST was
                // never confirmed, now that uploads are permitted (Req 2.6, 2.7).
                retryPersistedQueue();
                log::info("Demon Tier Tracker: Initial Sync complete ({} batch(es)).",
                          batchCount);
            } else {
                s_session.markFailed();   // leave initial_sync_done unset (Req 1.8)
            }
        });
    }).detach();
}

}  // namespace

void runInitialSync() {
    // --- Main-thread, O(1) section (Req 3.1) ---------------------------------
    if (s_dispatched) {
        // Already handled this session (the menu can re-init many times).
        return;
    }

    const std::optional<std::string> token = getConfiguredToken();  // Req 4.4/4.5

    const SyncAction action = decideSyncAction(token.has_value(), s_session.isDone());
    switch (action) {
        case SyncAction::AlreadyDone:
            s_dispatched = true;
            return;

        case SyncAction::SkipNoToken:
            // No token: skip the sync and record it was not attempted (Req 1.7,
            // 4.5). A later launch with a token configured will still sync.
            s_dispatched = true;
            s_session.markSkippedNoToken();
            log::info(
                "Demon Tier Tracker: no Secret Player Token configured; Initial "
                "Sync skipped (not attempted). Set your token in the mod settings.");
            return;

        case SyncAction::Attempt:
            break;
    }

    // --- Dispatch the heavy work off the main thread -------------------------
    s_dispatched = true;
    s_session.markInProgress();
    readAndUpload(*token);
}

}  // namespace tracker
