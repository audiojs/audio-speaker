# v2

## Phase 1: Native miniaudio addon
* [x] Vendor miniaudio.h v0.11.25 (single header, stripped with MA_NO_* flags)
* [x] Write speaker.c — N-API addon with ring buffer (open/write/flush/close)
* [x] Write binding.gyp — platform-conditional link flags
* [x] Test native addon standalone (371KB binary, 440Hz sine plays clean)
* [x] GC finalizer for safe cleanup

## Phase 2: Backend abstraction
* [x] Backend interface (open/write/flush/close)
* [x] src/backends/pvspeaker.js — @picovoice/pvspeaker-node wrapper
* [x] src/backends/miniaudio.js — our addon wrapper with retry on full ring buffer
* [x] src/backends/process.js — sox/ffplay/aplay fallback
* [x] src/backend.js — cascade tries open(), falls through on failure

## Phase 3: Public API + ESM
* [x] index.js — ESM, async Speaker(opts) → write(chunk, cb), zero runtime deps
* [x] stream.js — ESM, standard Node Writable with destroy safety
* [x] browser.js — ESM, Web Audio API with autoplay resume, context ownership
* [x] package.json — "type": "module", exports map, engines >=18
* [x] Configurable buffer size (default 50ms)
* [x] AudioBuffer detection + PCM conversion inlined

## Phase 4: Cleanup + distribution
* [x] Remove all old deps (audio-through, inherits, pull-stream, speaker, audio-sink, etc.)
* [x] Remove dead files
* [x] Modernize .gitignore
* [x] Update readme
* [x] Platform packages: @audio/speaker-{platform}-{arch} (esbuild-style)
* [x] Prebuildify for mac arm64
* [x] Loader: @audio pkg → prebuilds/ → build/

## Phase 5: Tests + CI
* [x] 16/16 tests pass — tst framework, same test.js for browser+node
* [x] Fade envelope on test sine (no clicks)
* [x] Formats: mono, stereo, 22050/44100/48000/96000 Hz
* [x] Lifecycle: double close, destroy mid-playback, write after flush
* [x] AudioBuffer input (float32→int16 conversion)
* [x] Browser tests via tst (test.html, manual run on user gesture)
* [x] GitHub Actions CI: test matrix (3 OS × 3 Node) + prebuild workflow

## Remaining
* [ ] Build and publish platform packages for all 5 platforms
* [ ] Backpressure: expose ring buffer pressure to stream highWaterMark
