/**
 * @module audio-speaker
 *
 * Output audio data to speaker.
 * Returns write(chunk, cb) async sink function.
 */
import { open } from './src/backend.js'

const defaults = {
  sampleRate: 44100,
  channels: 2,
  bitDepth: 16,
  bufferSize: 50
}

// detect AudioBuffer (has getChannelData + numberOfChannels + sampleRate)
function isAudioBuffer(buf) {
  return buf && typeof buf.getChannelData === 'function' && buf.numberOfChannels > 0
}

// convert AudioBuffer → interleaved int16 PCM Buffer
function audioBufferToPCM(ab, bitDepth) {
  const ch = ab.numberOfChannels
  const len = ab.length
  const bps = bitDepth / 8
  const buf = Buffer.alloc(len * ch * bps)

  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const sample = ab.getChannelData(c)[i]
      const offset = (i * ch + c) * bps
      if (bitDepth === 16) {
        buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), offset)
      } else if (bitDepth === 32) {
        buf.writeFloatLE(sample, offset)
      } else if (bitDepth === 8) {
        buf[offset] = Math.max(0, Math.min(255, Math.round((sample + 1) * 127.5)))
      }
    }
  }
  return buf
}

export default async function Speaker(opts) {
  const config = { ...defaults, ...opts }
  const { name, device } = await open(config, config.backend)

  const bpf = config.channels * (config.bitDepth / 8)
  // Real-time pacing: the async write callback fires when data is copied to the ring
  // buffer, not when the device consumes it. For small writes, this is nearly instant.
  // Without pacing, callback-chain producers outrun playback and overwrite unplayed data.
  let audioFrames = 0
  let wallStart = 0
  const margin = config.bufferSize * 0.75

  write.end = () => { device.close() }
  write.flush = (cb) => { device.flush(cb) }
  write.close = () => { device.close() }
  write.backend = name

  return write

  function write(chunk, cb) {
    if (chunk == null) {
      device.flush(() => { device.close(); cb?.(null) })
      return
    }

    const buf = isAudioBuffer(chunk) ? audioBufferToPCM(chunk, config.bitDepth) : chunk
    const frames = (buf.length / bpf) | 0

    device.write(buf, (err, written) => {
      if (!cb) return
      audioFrames += frames
      if (!wallStart) { wallStart = performance.now(); cb(err, written); return }
      // Defer callback until wall time catches up to (audioTime - margin).
      let delayMs = (audioFrames / config.sampleRate * 1000 - margin) - (performance.now() - wallStart)
      if (delayMs > 1) setTimeout(() => cb(err, written), delayMs)
      else cb(err, written)
    })
  }
}
