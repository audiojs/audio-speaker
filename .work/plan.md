# audio-speaker v2 — Implementation Plan

## Problem

v1.x is broken on all modern Node (>=14). `audio-through` sets read-only stream property, `speaker` has chronic build failures. The package is unusable.

## Architecture

```
audio-speaker/
  index.js              ← main entry: Speaker(opts) → write(chunk, cb)
  stream.js             ← Node Writable stream wrapper (uses index.js internally)
  browser.js            ← Browser entry (web-audio-stream → ctx.destination)
  src/
    backend.js          ← Backend detection + loading (priority cascade)
    backends/
      pvspeaker.js      ← @picovoice/pvspeaker-node wrapper
      miniaudio.js      ← Our own N-API addon wrapper
      process.js        ← Fallback: pipe to sox/ffplay/aplay/mpv
  native/
    miniaudio.h         ← Vendored single-header (stripped with MA_NO_* flags)
    speaker.c           ← N-API addon: ring buffer + device open/write/close
    binding.gyp         ← node-gyp build config
  package.json
  test.js
```

### Browser field (package.json)
```json
{ "browser": { "./index.js": "./browser.js" } }
```

## Backend Interface

Every backend implements:
```js
{
  open(opts)            // → initializes device {sampleRate, channels, bitDepth}
  write(pcmBuffer, cb)  // → writes PCM data, calls cb when ready for more
  flush(cb)             // → waits for buffered data to finish playing
  close()               // → releases device
}
```

## Backend Priority

```
1. pvspeaker      — optional dep, prebuilt, production-quality miniaudio
2. miniaudio      — our own N-API addon, compiled or prebuilt
3. process        — sox/ffplay stdin pipe (last resort, high latency)
```

Selection: try loading in order, first success wins. Override via `Speaker({ backend: 'pvspeaker' | 'miniaudio' | 'process' })`.

## Public API

### Direct (default export)
```js
const Speaker = require('audio-speaker')
const write = Speaker({ sampleRate: 44100, channels: 2, bitDepth: 16 })

write(pcmBuffer, (err) => { /* ready for next chunk */ })
write(null)  // end
write.end()  // force close
```

### Stream
```js
const Speaker = require('audio-speaker/stream')
const speaker = new Speaker({ sampleRate: 44100, channels: 2 })
source.pipe(speaker)
```

Stream is a standard Node Writable (no audio-through dependency).

### Browser (auto-selected by bundlers)
```js
// Same API, routes to Web Audio API via web-audio-stream
const Speaker = require('audio-speaker')
```

## Phases

### Phase 1: Native miniaudio addon (~300 lines C)

Build `native/speaker.c` — minimal N-API addon:

1. **Device management**
   - `ma_device` with playback callback
   - `ma_pcm_rb` ring buffer bridging push writes ↔ pull callback
   - Configure: sample rate, channels, format (int16/float32)

2. **Exported N-API functions**
   - `speaker_open(sampleRate, channels, bitDepth)` → handle
   - `speaker_write(handle, buffer)` → pushes into ring buffer, returns bytes written
   - `speaker_flush(handle)` → blocks until ring buffer drains
   - `speaker_close(handle)` → stops device, frees resources

3. **Compile flags** (minimize binary ~200-400KB):
   ```c
   #define MA_NO_DECODING
   #define MA_NO_ENCODING
   #define MA_NO_RESOURCE_MANAGER
   #define MA_NO_NODE_GRAPH
   #define MA_NO_ENGINE
   #define MA_NO_GENERATION
   ```

4. **binding.gyp** — compile with node-gyp, platform conditions for link flags

5. **Prebuild** — use `prebuildify` to ship `.node` binaries for:
   - macOS x64 + arm64
   - Linux x64 + arm64
   - Windows x64

### Phase 2: Backend abstraction + pvspeaker integration

1. **src/backend.js** — detection cascade:
   ```js
   function loadBackend(preference) {
     if (preference) return require(`./backends/${preference}`)
     try { return require('./backends/pvspeaker') } catch {}
     try { return require('./backends/miniaudio') } catch {}
     return require('./backends/process')
   }
   ```

2. **src/backends/pvspeaker.js** — wraps `@picovoice/pvspeaker-node`:
   - `open()` → `new PvSpeaker(sampleRate, bitsPerDepth, { bufferSizeSecs })`
   - `write(buf, cb)` → `speaker.write(buf)`, cb on completion
   - `flush(cb)` → `speaker.flush()`
   - `close()` → `speaker.stop()` + `speaker.delete()`

3. **src/backends/miniaudio.js** — wraps our native addon:
   - `open()` → `addon.speaker_open(sampleRate, channels, bitDepth)`
   - `write(buf, cb)` → `addon.speaker_write(handle, buf)`, cb when ring buffer has space
   - `flush(cb)` → `addon.speaker_flush(handle)`
   - `close()` → `addon.speaker_close(handle)`

4. **src/backends/process.js** — fallback:
   - Detect available: `sox` → `ffplay` → `aplay`(linux) / `afplay`(mac) / `powershell`(win)
   - Spawn process, pipe PCM to stdin with format flags
   - `write(buf, cb)` → `proc.stdin.write(buf, cb)`
   - Limited: no flush guarantee, higher latency

### Phase 3: Public API (index.js, stream.js, browser.js)

1. **index.js** — direct write API:
   ```js
   module.exports = function Speaker(opts) {
     const backend = loadBackend(opts?.backend)
     const device = backend.open(opts)
     // ... format conversion (AudioBuffer → PCM via pcm-util)
     // ... return write(chunk, cb) function
   }
   ```

2. **stream.js** — standard Node Writable:
   ```js
   class Speaker extends Writable {
     constructor(opts) { /* opens backend */ }
     _write(chunk, enc, cb) { /* delegates to backend.write */ }
     _final(cb) { /* flush + close */ }
   }
   ```

3. **browser.js** — Web Audio API (keep existing approach via web-audio-stream)

### Phase 4: Cleanup + dependencies

**Remove:**
- `audio-through` (broken, cause of #61/#63)
- `inherits` (use class/extends)
- `pull-stream` + `pull.js` (niche, not worth maintaining)
- `speaker` optional dep (replaced by backends)
- `audio-sink` optional dep (replaced by process backend)

**Keep:**
- `pcm-util` or `pcm-convert` — format conversion
- `is-audio-buffer` — type detection
- `web-audio-stream` — browser backend

**Add:**
- `@picovoice/pvspeaker-node` as optional dep
- `node-gyp-build` or `prebuildify` for native addon loading

### Phase 5: Tests + CI

- Test each backend independently
- Test format conversion (float32→int16, mono→stereo, etc.)
- Test stream API backpressure
- Test end/close/destroy lifecycle
- CI: GitHub Actions matrix (macOS/Linux/Windows × Node 18/20/22)

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Foundation lib | miniaudio | Zero deps, single header, smallest binary, most platforms, actively maintained |
| Primary backend | pvspeaker | Prebuilt, production-quality, maintained by funded company |
| Fallback backend | Own miniaudio addon | Independence, full control, lighter than pvspeaker |
| Last resort | Process pipe | Works everywhere something is installed, no compilation |
| API style | `write(chunk, cb)` | Consensus from #42, simplest, composable |
| Stream impl | Native Writable | No audio-through (broken), no inherits (unnecessary) |
| Pull-stream | Drop | Niche audience, adds dep weight, can be separate package |
| Browser | web-audio-stream | Already works, standard Web Audio API |
| Prebuilds | prebuildify | Ships binaries in npm tarball, no postinstall downloads |
