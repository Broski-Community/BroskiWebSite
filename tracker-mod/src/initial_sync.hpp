/**
 * Tracker_Mod — Geode-dependent Initial_Sync orchestration (declarations).
 *
 * This header declares the entry point the `MenuLayer::init` hook calls to kick
 * off the one-shot, per-session Initial_Sync: a BACKGROUND read of local demon
 * completions, validation/filtering, JSON batching, and an asynchronous POST of
 * each batch to the Records_API with the `X-Player-Token` header.
 *
 * The pure decision and session-flag logic lives in <tracker/initial_sync.h>; the
 * token read in src/token_setting.*; the read in src/completion_reader.*; and the
 * filter/serialization in the pure headers under include/tracker/. THIS file's
 * implementation (initial_sync.cpp) includes the Geode SDK (`web::WebRequest`,
 * `Loader`), so it can only be compiled on a machine with `GEODE_SDK` configured
 * and is NOT part of the pure-logic test build (-DTRACKER_BUILD_TESTS=ON).
 *
 * Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 3.1, 4.4, 4.5.
 */
#pragma once

namespace tracker {

/**
 * Records_API endpoint for the Initial_Sync bulk upload (design: `POST
 * /api/v1/records`).
 *
 * Defaults to the live deployment at https://www.ibroski.net/api/v1/records. It
 * can still be overridden at configure time without editing source, e.g.:
 *
 *   cmake -S tracker-mod -B build \
 *     -DCMAKE_CXX_FLAGS='-DTRACKER_RECORDS_API_URL="https://your.deployment/api/v1/records"'
 */
#ifndef TRACKER_RECORDS_API_URL
#define TRACKER_RECORDS_API_URL "https://www.ibroski.net/api/v1/records"
#endif
inline constexpr const char* kRecordsApiUrl = TRACKER_RECORDS_API_URL;

/// HTTP header carrying the Secret_Player_Token on every request (design:
/// "Authentication header"; Req 4.4).
inline constexpr const char* kPlayerTokenHeader = "X-Player-Token";

/// Per-request timeout for the Initial_Sync POST(s): the mod waits up to 30 s for
/// a response and hard-cancels at the boundary (Req 1.5, 1.6, 3.3).
inline constexpr int kSyncRequestTimeoutSeconds = 30;

/**
 * Performs the one-shot Initial_Sync for this session (idempotent per launch).
 *
 * MUST be called from the game's main thread (it is invoked from the
 * `MenuLayer::init` hook). It performs only O(1) work synchronously — a session
 * guard check and a token read — then dispatches the local-completion read and
 * the network POSTs onto background threads so the main thread is never stalled
 * (Req 3.1).
 *
 * Behavior:
 *   - If Initial_Sync already ran this session, returns immediately.
 *   - If no valid token is configured, records that the sync was skipped/not
 *     attempted and returns (Req 1.7, 4.5).
 *   - Otherwise reads local completions on a worker thread, filters and batches
 *     them, and POSTs each batch with the `X-Player-Token` header (Req 1.1, 1.4,
 *     4.4). The session `initial_sync_done` flag is set only if every batch
 *     returns HTTP 200 within the 30 s timeout (Req 1.6); any failure or timeout
 *     leaves it unset so the sync is retried on the next launch (Req 1.8).
 */
void runInitialSync();

}  // namespace tracker
