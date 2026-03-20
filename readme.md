# audio-speaker

Output audio data to speaker in node or browser.

## Usage

```js
import Speaker from 'audio-speaker'

const write = await Speaker({
  sampleRate: 44100,
  channels: 2,
  bitDepth: 16,
  // bufferSize: 50,           // ring buffer ms (default 50)
  // backend: 'miniaudio',     // force backend: 'pvspeaker', 'miniaudio', 'process'
})

write(pcmBuffer, (err) => {
  // ready for next chunk
})
write(null) // end playback
```

### Stream (Node.js)

```js
import SpeakerStream from 'audio-speaker/stream'

// Standard Node.js Writable stream — pipe any PCM source
source.pipe(new SpeakerStream({ sampleRate: 44100, channels: 2 }))
```

### Browser

Bundlers automatically resolve to the Web Audio API backend via the `browser` field.

```js
import Speaker from 'audio-speaker'

const write = Speaker({ sampleRate: 44100, channels: 2 })
write(pcmBuffer, (err, frames) => {})
```

## Backends

Backends are tried in order; first successful one wins.

| Backend | How | Latency | Install |
|---|---|---|---|
| `miniaudio` | N-API addon wrapping [miniaudio.h](https://github.com/mackron/miniaudio) | Low | Prebuilt via `@audio/speaker-*` packages |
| `process` | Pipes PCM to ffplay/sox/aplay | High | System tool must be installed |
| `webaudio` | Web Audio API (browser only) | Low | Built-in |

Prebuilt binaries are shipped as optional platform packages (like esbuild):

| Platform | Package |
|---|---|
| macOS arm64 | `@audio/speaker-darwin-arm64` |
| macOS x64 | `@audio/speaker-darwin-x64` |
| Linux x64 | `@audio/speaker-linux-x64` |
| Linux arm64 | `@audio/speaker-linux-arm64` |
| Windows x64 | `@audio/speaker-win32-x64` |

If no prebuilt is available, falls back to compiling from source via `node-gyp` (requires C compiler).

## API

### `write = await Speaker(opts?)`

Returns an async sink function. Options:

- `sampleRate` — default `44100`
- `channels` — default `2`
- `bitDepth` — `8`, `16` (default), `24`, `32`
- `bufferSize` — ring buffer in ms, default `50`
- `backend` — force a specific backend

### `write(buffer, cb?)`

Write PCM data. Accepts `Buffer`, `Uint8Array`, or `AudioBuffer`. Callback fires when ready for next chunk.

### `write(null)`

End playback. Flushes remaining audio then closes device.

### `write.flush(cb?)`

Wait for buffered audio to finish playing.

### `write.close()`

Immediately close the audio device.

### `write.backend`

Name of the active backend (`'miniaudio'`, `'process'`, `'webaudio'`).

## Building

```sh
npm run build          # compile native addon locally
npm test               # run tests
```

### Platform binaries

Platform packages live in `packages/speaker-{platform}-{arch}/`. Binaries are built by CI and not checked into git.

**Local build** (current platform):
```sh
npx node-gyp@latest rebuild
cp build/Release/speaker.node packages/speaker-$(node -p "process.platform+'-'+process.arch")/
```

**Cross-platform** (Docker for Linux):
```sh
# linux x64
docker run --rm --platform linux/amd64 \
  -v $(pwd):/src:ro -v $(pwd)/packages/speaker-linux-x64:/out node:22-slim bash -c \
  'apt-get update -qq && apt-get install -y -qq python3 make g++ >/dev/null 2>&1 &&
   cp -r /src /build && cd /build && npx node-gyp@latest rebuild 2>&1 | tail -3 &&
   cp build/Release/speaker.node /out/'

# linux arm64 (via QEMU)
docker run --rm --platform linux/arm64 \
  -v $(pwd):/src:ro -v $(pwd)/packages/speaker-linux-arm64:/out node:22-slim bash -c \
  'apt-get update -qq && apt-get install -y -qq python3 make g++ >/dev/null 2>&1 &&
   cp -r /src /build && cd /build && npx node-gyp@latest rebuild 2>&1 | tail -3 &&
   cp build/Release/speaker.node /out/'
```

**macOS x64** (cross-compile on ARM64 mac):
```sh
npx node-gyp@latest rebuild --arch=x64
mkdir -p artifacts/speaker-darwin-x64
cp build/Release/speaker.node artifacts/speaker-darwin-x64/
```

**Windows**: built by GitHub Actions (no local cross-compilation).

## Publishing

```sh
# 1. Bump version + push
npm version patch && git push && git push --tags

# 2. Wait for CI to build all platforms
gh run watch

# 3. Download binaries from CI
rm -rf artifacts
gh run download --dir artifacts \
  -n speaker-darwin-arm64 -n speaker-darwin-x64 \
  -n speaker-linux-x64 -n speaker-linux-arm64 -n speaker-win32-x64

# 3a. (fallback) If darwin-x64 CI is unavailable, cross-compile locally:
npx node-gyp@latest rebuild --arch=x64
mkdir -p artifacts/speaker-darwin-x64
cp build/Release/speaker.node artifacts/speaker-darwin-x64/

# 4. Copy to packages + publish
for pkg in packages/speaker-*/; do
  cp artifacts/$(basename $pkg)/speaker.node $pkg/
  (cd $pkg && npm publish)
done
npm publish
```

## License

MIT
