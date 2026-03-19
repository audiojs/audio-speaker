## Decisions

* **miniaudio** as foundation — single-header C, zero system deps, dlopen's audio backends at runtime. Actively maintained. Compiles with any C compiler, no cmake. ~390KB binary.
* **Own N-API addon** rather than wrapping pvspeaker/audify/naudiodon — full control, lighter, no third-party dep.
* **Async write** via `napi_async_work` — write blocks on libuv worker thread, not JS event loop. Eliminates glitches from setTimeout polling.
* **Ring buffer** (`ma_pcm_rb`) bridges push writes ↔ pull callback. Read loop handles wraparound (single acquire_read only returns contiguous region).
* **Capture ring buffer** (opt-in) — playback callback copies output for verification. 5s buffer. Proves sample-accurate playback.
* **esbuild-style platform packages** (`@audio/speaker-{platform}-{arch}`) — each ~350-430KB, only matching platform installs. Fallback: compile from source via `gypfile: true`.
* **Process backend** as last resort — pipes PCM to ffplay/sox/aplay. High latency, no real-time.
* **Browser**: standalone Web Audio API, no deps. `ctx.resume()` handles autoplay policy.
* **50ms default ring buffer** — balance between latency and jitter tolerance. Configurable via `bufferSize`.

## Alternatives considered

* **node-web-audio-api** (IRCAM, Rust/cpal) — too heavy, we already have web-audio-api in audiojs
* **@picovoice/pvspeaker-node** — good but proprietary wrapper, adds dep
* **audify** (RtAudio) — stale since 2023
* **cpal** (Rust) — no C API, two-layer FFI needed
* **cubeb** (Mozilla) — needs both C and Rust toolchains
* **PortAudio** — what node-speaker used, chronic build failures
* **libsoundio** — unmaintained since 2023

## v1 issues that drove v2

* `audio-through` crashes on Node >=14 (sets read-only stream property)
* `speaker` (node-speaker) has chronic node-gyp build failures, especially Windows
* v2.0 PR #44 (mpg123/out123) stalled in 2017
* audiojs team concluded cubeb was better path but never shipped it
