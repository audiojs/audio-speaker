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

### Stream

```js
import SpeakerStream from 'audio-speaker/stream'

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
| `pvspeaker` | [@picovoice/pvspeaker-node](https://github.com/Picovoice/pvspeaker) (miniaudio, prebuilt) | Low | `npm i @picovoice/pvspeaker-node` |
| `miniaudio` | Own N-API addon wrapping [miniaudio.h](https://github.com/mackron/miniaudio) | Low | `npm run build` (needs C compiler) |
| `process` | Pipes PCM to ffplay/sox/aplay | High | System tool must be installed |
| `webaudio` | Web Audio API (browser only) | Low | Built-in |

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

Name of the active backend (`'miniaudio'`, `'pvspeaker'`, `'process'`, `'webaudio'`).

## License

MIT
