## Backends

### Tier 1: Primary (Low Latency, Prebuilt, Actively Maintained)

#### node-web-audio-api (Rust/cpal/napi-rs) — IRCAM
- **Backend**: cpal (Rust) → WASAPI/CoreAudio/ALSA/JACK natively
- **Platform**: macOS x64/arm64, Windows x64/arm64, Linux x64/arm/arm64
- **Install**: `npm install node-web-audio-api` — prebuilt binaries, no compilation
- **Latency**: Low. JACK backend for ultra-low. Default ALSA may crackle at 128 frames
- **API**: Full W3C Web Audio API — AudioContext, AudioBufferSourceNode, GainNode, etc.
- **License**: MIT
- **Maintenance**: Active, institutional backing (IRCAM — French national research institute)
- **Strengths**: Standard API identical in browser and Node. Rich audio graph (gain, effects, spatialization). Experimental cubeb support too
- **Weaknesses**: Heavier than needed for simple PCM output. Linux prebuilt requires JACK/PipeWire-JACK
- **Verdict**: Best if we want standard API + audio graph capabilities

#### @picovoice/pvspeaker-node (miniaudio) — Picovoice
- **Backend**: miniaudio (single-header C, zero deps)
- **Platform**: macOS x64/arm64, Windows x64/arm64, Linux x86_64, Raspberry Pi 3/4/5
- **Install**: `npm install @picovoice/pvspeaker-node` — prebuilt binaries, no compilation
- **Latency**: Low (miniaudio callback-based, ~1ms macOS, ~10ms typical)
- **API**: Simple: `init(sampleRate, bitsPerDepth)`, `write(pcm)`, `flush()`, `stop()`
- **License**: Apache 2.0
- **Maintenance**: Active, funded company (Picovoice)
- **Strengths**: Designed for exactly real-time TTS streaming. Minimal API surface. Zero system deps
- **Weaknesses**: Proprietary wrapper around miniaudio. Limited audio graph features
- **Verdict**: Best for simple PCM-to-speaker streaming

### Tier 2: Viable (Trade-offs)

#### Custom miniaudio N-API addon (build our own)
- **Backend**: miniaudio — single header C, zero deps, all platforms
- **Platform**: Everything miniaudio supports (WASAPI, CoreAudio, ALSA, PulseAudio, JACK, AAudio, DirectSound)
- **Latency**: Lowest possible — direct miniaudio callback
- **API**: Whatever we design
- **Strengths**: Full control, zero external deps, simplest C lib to wrap. Prebuild via node-pre-gyp or prebuildify
- **Weaknesses**: Maintenance burden. PvSpeaker already did this work
- **Existing npm**: `@thesusheer/node-miniaudio` (immature, file-oriented), `@ekx/miniaudio` (abandoned)
- **Verdict**: Only if PvSpeaker is insufficient and we need full control

#### audify (RtAudio/N-API)
- **Backend**: RtAudio → ALSA/JACK/PulseAudio/CoreAudio/WASAPI/ASIO/DirectSound
- **Platform**: All three. Prebuilt for N-API 5-9
- **Latency**: Low. ASIO on Windows is a differentiator
- **API**: `RtAudioApi`, `Speaker`, `Microphone` + Opus encode/decode
- **License**: MIT
- **Maintenance**: **Stale since Jan 2023**
- **Verdict**: Good library but abandoned. Fork risk

#### @kmamal/sdl (SDL2)
- **Platform**: All three. Prebuilt binaries
- **Latency**: Moderate (game-oriented, buffer-based)
- **Strengths**: Active maintenance. Well-tested
- **Weaknesses**: Full SDL binding (~heavy for audio-only). Not designed for pro audio latency
- **Verdict**: Only if we also need windowing/input

#### naudiodon (PortAudio)
- **Backend**: PortAudio compiled locally
- **Platform**: All three
- **Latency**: Low (PortAudio)
- **Weaknesses**: Requires node-gyp. "Not production ready" per own README. Forks exist (naudiodon2, naudiodon-neo)
- **Verdict**: Legacy option. Build pain same as node-speaker

### Tier 3: Fallback (Higher Latency, Less Control)

#### Process-based (sox, ffplay, afplay, aplay, mpv, powershell)
- **Latency**: High (50-300ms+ spawn overhead)
- **PCM streaming**: Not viable (pipe buffering, no flow control)
- **Installation**: Requires system tools pre-installed
- **Verdict**: Suitable only as last-resort fallback for "play this file" scenarios. Not for real-time PCM

| Tool | Platform | Notes |
|---|---|---|
| `sox`/`play` | All (if installed) | Most capable. Handles PCM stdin with format flags |
| `ffplay` | All (if installed) | Can read PCM from stdin: `ffplay -f s16le -ar 44100 -ac 2 -` |
| `aplay` | Linux only | Direct ALSA. Installed by default on most Linux |
| `afplay` | macOS only | Built-in. File-only, no stdin |
| `powershell` | Windows only | .NET SoundPlayer. File-only |
| `mpv` | All (if installed) | Fast. Can read PCM from stdin |

#### play-sound (npm, ~30k/wk)
- Shells out to whichever player is available (mplayer, afplay, mpg123, aplay, cvlc, powershell)
- Files only, no PCM streaming. Unreliable — depends on what's installed

### Not Viable

- **Pure JS PCM output**: Not possible. JS cannot access audio hardware without native addon or child process
- **WASM audio output**: Can process audio but cannot access hardware. Still needs native backend for output
- **web-audio-engine** (pure JS Web Audio): Abandoned. Outputs PCM to a stream but still needs speaker backend

---

## Current State of audio-speaker

### v1.x (published on npm): BROKEN
- Crashes on Node >= 14 due to `audio-through` v2.2.3 trying to set read-only `writableObjectMode` on Duplex streams (#61, #63)
- `speaker` dep has chronic node-gyp build failures, especially Windows (~7GB MSVC requirement, #2 — 80 comments)
- **Effectively unusable on all modern Node versions**

### v2.0 attempt (PR #44, never merged)
- Replaced `speaker` with `audio-mpg123` (mpg123/out123 custom binding with node-pre-gyp)
- Simplified API: `let write = Speaker(options); write(audioBuffer, cb)`
- Stalled mid-2017: chunkSize NaN, only int16 worked, no macOS prebuilt, endianness issues
- The audiojs team later concluded **cubeb** was the better path (#2, @jamen Feb 2019)

### Other mentioned alternatives from issues
- **node-cubeb**: audiojs-owned wrapper for Mozilla's cubeb. Incomplete, never shipped
- **node-audioworklet** (#62): Uses AudioWorklet API. @jamen said "Looks promising!" (May 2022). Minimal traction

---

## Key Issues Summary

| # | Title | Category | Status |
|---|---|---|---|
| #63 | Cannot set writableObjectMode | **Crash (Node 21+)** | Open |
| #61 | Same root cause as #63 | **Crash (Node 14+)** | Open |
| #2 | npm install fails on Windows | **Build/Platform** | Open, 80 comments |
| #47 | v2.0 beta fails to build on macOS | Build | Open |
| #22 | CoreAudio buffer underflow | Latency | Open |
| #42 | v2.0 API proposal | API Design | Open |
| #62 | node-audioworklet as alternative | Alternative | Open |
| #55 | Multichannel support | Feature | Open |
| #20 | Inconsistent channel output | Bug | Open |
| #51 | Broken README examples | Docs | Open |

---

## Recommendation

**Multi-backend architecture with priority fallback:**

1. **node-web-audio-api** (primary) — standard API, prebuilt, rich features, institutional maintenance
2. **@picovoice/pvspeaker-node** (lightweight alternative) — minimal, fast, prebuilt
3. **Custom miniaudio addon** (own backend, future) — full control if needed
4. **Process-based** (last-resort fallback) — sox/ffplay for when nothing else works

The API should abstract over backends so users get the best available on their platform without caring which one is active. Default: auto-detect best available. Override: `Speaker({ backend: 'webaudio' | 'pvspeaker' | 'process' })`.

## Alternatives

- [node-web-audio-api](https://github.com/ircam-ismm/node-web-audio-api) — Full W3C Web Audio in Node via Rust/cpal
- [@picovoice/pvspeaker-node](https://github.com/Picovoice/pvspeaker) — miniaudio PCM output
- [audify](https://github.com/almogh52/audify) — RtAudio N-API (stale)
- [naudiodon](https://github.com/Streampunk/naudiodon) — PortAudio streams (semi-active)
- [@kmamal/sdl](https://github.com/kmamal/node-sdl) — SDL2 full binding (active)
- [speaker](https://github.com/TooTallNate/node-speaker) — mpg123 output (stale, build issues)
- [play-sound](https://www.npmjs.com/package/play-sound) — Process-based file playback
