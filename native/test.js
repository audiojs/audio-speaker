/**
 * Standalone test for the miniaudio N-API addon.
 * Generates a 440Hz sine wave and plays it for 1 second.
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const speaker = require('../build/Release/speaker.node')

const sampleRate = 44100
const channels = 2
const bitDepth = 16
const duration = 1
const frequency = 440

const handle = speaker.open(sampleRate, channels, bitDepth, 50)
console.log('Speaker opened:', sampleRate + 'Hz', channels + 'ch', bitDepth + 'bit')

const totalFrames = sampleRate * duration
const framesPerChunk = 1024
const bytesPerSample = bitDepth / 8
const bytesPerFrame = bytesPerSample * channels

let framesWritten = 0

function writeChunk() {
  if (framesWritten >= totalFrames) {
    const poll = setInterval(() => {
      if (speaker.flush(handle)) {
        clearInterval(poll)
        speaker.close(handle)
        console.log('Done. Wrote', framesWritten, 'frames')
      }
    }, 10)
    return
  }

  const frames = Math.min(framesPerChunk, totalFrames - framesWritten)
  const buf = Buffer.alloc(frames * bytesPerFrame)

  for (let i = 0; i < frames; i++) {
    const t = (framesWritten + i) / sampleRate
    const sample = Math.sin(2 * Math.PI * frequency * t)
    const val = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
    for (let ch = 0; ch < channels; ch++) {
      buf.writeInt16LE(val, (i * channels + ch) * bytesPerSample)
    }
  }

  const written = speaker.write(handle, buf)
  framesWritten += written

  if (written < frames) {
    setTimeout(writeChunk, 5)
  } else {
    setImmediate(writeChunk)
  }
}

writeChunk()
