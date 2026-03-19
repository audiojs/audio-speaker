# v2

## Phase 1: Native miniaudio addon
* [x] Vendor miniaudio.h (single header, stripped with MA_NO_* flags)
* [x] Write speaker.c — N-API addon with ring buffer (open/write/flush/close)
* [x] Write binding.gyp — platform-conditional link flags
* [x] Test native addon standalone (371KB binary, 440Hz sine plays clean)
* [x] GC finalizer for safe cleanup
* [ ] Prebuild binaries (macOS x64+arm64, Linux x64+arm64, Windows x64)

## Phase 2: Backend abstraction
* [x] Backend interface (open/write/flush/close)
* [x] src/backends/pvspeaker.js — @picovoice/pvspeaker-node wrapper
* [x] src/backends/miniaudio.js — our addon wrapper
* [x] src/backends/process.js — sox/ffplay/aplay fallback
* [x] src/backend.js — cascade tries open(), falls through on failure

## Phase 3: Public API + ESM
* [x] index.js — ESM, async Speaker(opts) → write(chunk, cb)
* [x] stream.js — ESM, standard Node Writable
* [x] browser.js — ESM, Web Audio API (standalone, no web-audio-stream dep)
* [x] package.json — "type": "module", exports map, engines >=18
* [x] Configurable buffer size (default 50ms)
* [ ] Backpressure: bind to real-time, don't generate more than needed

## Phase 4: Cleanup
* [x] Remove audio-through, inherits, pull-stream, speaker, audio-sink deps
* [x] Remove pull.js, cli.js, browser-direct.js, browser-stream.js, direct.js
* [x] Remove .travis.yml, .eslintrc.json
* [x] Modernize .gitignore
* [ ] Update readme

## Phase 5: Tests + CI
* [x] Tests pass (7/7) — direct API, stream API, backend selection
* [x] Mono playback, 48kHz sample rate tested
* [ ] Test format conversion (float32↔int16)
* [ ] Test variety of channels (4, 6)
* [ ] Test different sample rates (22050, 96000)
* [ ] Test stream backpressure
* [ ] Test end/close/destroy lifecycle
* [ ] Browser tests via tst
* [ ] GitHub Actions CI matrix (macOS/Linux/Windows × Node 18/20/22)
