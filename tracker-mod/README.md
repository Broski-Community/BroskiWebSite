# Demon Tier Tracker — Geode Mod (`tracker-mod/`)

The **Tracker_Mod** component of the Demon Tier Tracker feature. It is a C++ Geode
SDK mod that runs inside the player's Geometry Dash client, reads local demon
completions, and reports them to the Records_API. It is intentionally isolated
from the React web app in this top-level directory and has its own build system.

> Status: **Phase 1 Initial Sync implemented** (through task 8.5). The token setting,
> local-completion read, filtering, JSON batching, and the `MenuLayer::init` →
> background read → POST pipeline are in place. Live Tracking (task 10) is added later.

## Layout

```
tracker-mod/
├── mod.json            Geode mod metadata (id, name, version, geode/gd targets, settings)
├── CMakeLists.txt      Geode mod build + opt-in pure-logic test build
├── src/
│   ├── main.cpp           Mod entry point + MenuLayer::init hook (triggers Initial Sync)
│   ├── token_setting.*    Geode wiring for the Secret Player Token setting (task 8.2)
│   ├── completion_reader.* GD-dependent read of local demon completions (task 8.3)
│   └── initial_sync.*     Initial Sync orchestration: background read → batch → POST (task 8.5)
├── include/
│   └── tracker/        Pure, Geode-independent logic (filter, serialization, gating,
│                       retry queue, token, and the Initial Sync decision/flag logic)
└── test/
    ├── CMakeLists.txt  rapidcheck test target (fetched via FetchContent)
    └── smoke_test.cpp  Scaffold property test proving the harness works
```

## Building the mod (requires the Geode toolchain)

The full mod build needs the Geometry Dash + Geode SDK toolchain, which is **not**
installed in CI or this scaffold environment. On a properly configured machine:

### Prerequisites

- **CMake** ≥ 3.21 and a **C++20** compiler
  - Windows: Visual Studio 2022 (MSVC) with clang-cl, or the toolchain Geode documents
  - macOS: a recent Xcode / Apple Clang
  - Android: the Android NDK
- The **Geode SDK** installed via the [Geode CLI](https://docs.geode-sdk.org/getting-started/),
  with the `GEODE_SDK` environment variable pointing at the SDK checkout.
- A matching **Geometry Dash** version (see `gd` targets in `mod.json` — currently
  `2.2074`). Adjust `mod.json`'s `geode` and `gd` versions to match your installed SDK/GD.

### Build & install

```bash
# Configure (GEODE_SDK must be set in your environment)
cmake -S tracker-mod -B tracker-mod/build

# Build the .geode package
cmake --build tracker-mod/build --config Release

# Or, with the Geode CLI from inside tracker-mod/:
geode build
```

Refer to the official Geode docs for installing the built `.geode` file into your
GD installation.

## Building & running the pure-logic tests (no Geode SDK required)

The logic that powers later property tests (completion filtering, JSON
serialization round-trip, higher-only gating, retry-queue invariants, token
validation) lives under `include/tracker/` and depends only on the C++ standard
library. It can be built and tested on any machine with a C++20 toolchain — no GD
headers, no Geode SDK.

```bash
cmake -S tracker-mod -B tracker-mod/build-tests -DTRACKER_BUILD_TESTS=ON
cmake --build tracker-mod/build-tests
ctest --test-dir tracker-mod/build-tests --output-on-failure
```

- Tests use **rapidcheck** (downloaded automatically via CMake `FetchContent`, so
  the first configure needs network access).
- Each property runs **≥ 100 iterations** (`RC_PARAMS=max_success=100`, set on the
  test in `test/CMakeLists.txt`).
- Property tests added in later tasks are tagged
  `Feature: demon-tier-tracker, Property {n}: {property_text}`.

## Configuration

The mod exposes a single Geode setting, **Secret Player Token** (`player-token`),
in which the player enters their 1–256 character upload token. It is attached to
every request to the Records_API as the `X-Player-Token` header.

Token validation/persistence (task 8.2) is implemented as follows:

- The pure validation rule lives in `include/tracker/token.hpp`
  (`tracker::is_valid_token`): a token is valid iff it is non-empty after trimming
  whitespace **and** 1–256 characters long. This header is Geode-independent and is
  unit-tested in `test/token_test.cpp` (Req 4.1, 4.3).
- The Geode wiring lives in `src/token_setting.cpp`: a settings-changed callback
  validates each save; valid saves are kept (Geode persists declared settings across
  launches automatically, Req 4.2), while empty/whitespace-only saves are rejected —
  the previously persisted token is restored and an error notification is shown
  (Req 4.3). `tracker::getConfiguredToken()` returns the current valid token (or
  none) for the networking layer (used by tasks 8.5 / 10).

## Initial Sync (task 8.5)

On the first `MenuLayer::init` per session, the mod runs a one-shot Initial Sync that
uploads the player's full local demon-completion history (Req 1):

- The hook body is **O(1) on the main thread** (Req 3.1): `tracker::runInitialSync()`
  (in `src/initial_sync.cpp`) does only a session-guard check and a token read, then
  dispatches the heavy work off-thread.
- The local read (`readLocalCompletions`), validation/filter (`filterCompletions`), and
  JSON batching (`chunkCompletionsSerialized`, ≤1000 records / ≤64 KB) run on a worker
  thread. Each batch is then POSTed via Geode's `web::WebRequest` (libcurl, background
  thread) with the `X-Player-Token` header (Req 4.4). An empty completion set is still
  uploaded once as `[]` (Req 1.4).
- The session flag `initial_sync_done` is set **only** when every batch returns HTTP 200
  within the 30 s timeout (Req 1.6); any failure, non-200, or timeout leaves it unset so
  the sync retries on the next launch (Req 1.8). If no token is configured, the sync is
  skipped and recorded as not attempted (Req 1.7, 4.5).
- The pure decision and flag-transition logic lives in
  `include/tracker/initial_sync.h` (`decideSyncAction`, `SyncSession`,
  `isSyncSuccessStatus`) and is fully testable without the Geode SDK.

### Records_API endpoint URL

The endpoint is a compile-time constant `tracker::kRecordsApiUrl` in
`src/initial_sync.hpp`, defaulting to the live deployment
`https://www.ibroski.net/api/v1/records`. You can still override
`TRACKER_RECORDS_API_URL` at configure time if you need a different target:

```bash
cmake -S tracker-mod -B tracker-mod/build \
  -DCMAKE_CXX_FLAGS='-DTRACKER_RECORDS_API_URL="https://your.deployment/api/v1/records"'
```

## Build limitations in this environment

The Geode SDK and the GD build toolchain are not available here, so the full mod
(`.geode`) cannot be compiled in this workspace. Only the pure-logic
`tracker_tests` target is intended to be portable. The Geode-dependent code in
`src/main.cpp`, `src/token_setting.cpp`, `src/completion_reader.cpp`, and
`src/initial_sync.cpp` (which uses `web::WebRequest`, `Loader`, and GD class
bindings) must be compiled on a machine with `GEODE_SDK` configured. The pure
Initial Sync decision/flag logic in `include/tracker/initial_sync.h` is verified by
the portable test build.
