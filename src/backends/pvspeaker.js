/**
 * PvSpeaker backend — @picovoice/pvspeaker-node (miniaudio-based, prebuilt)
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const { PvSpeaker } = require('@picovoice/pvspeaker-node')

export function open({ sampleRate = 44100, channels = 2, bitDepth = 16, bufferSize = 50 } = {}) {
  const speaker = new PvSpeaker(sampleRate, bitDepth, { bufferSizeSecs: bufferSize / 1000 })
  speaker.start()

  return {
    write(buf, cb) {
      try {
        // pvspeaker expects Int16Array for 16-bit
        const samples = bitDepth === 16
          ? new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2)
          : buf
        speaker.write(samples)
        cb?.(null, (buf.length / (bitDepth / 8) / channels) | 0)
      } catch (e) {
        cb?.(e)
      }
    },

    flush(cb) {
      try {
        speaker.flush()
        cb?.()
      } catch (e) {
        cb?.(e)
      }
    },

    close() {
      try {
        speaker.stop()
        speaker.release()
      } catch {}
    }
  }
}
