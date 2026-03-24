/**
 * @module audio-speaker/stream
 *
 * Node.js Writable stream for audio output.
 */
import { Writable } from 'node:stream'
import speaker from './index.js'

export default function writable(opts) {
  const { sampleRate = 44100, channels = 2, bitDepth = 16, bufferSize = 50 } = opts || {}
  const write = speaker(opts)

  return new Writable({
    highWaterMark: Math.round(sampleRate * channels * (bitDepth / 8) * bufferSize / 1000),
    write(chunk, _, cb) { write(chunk, (err) => cb(err || null)) },
    final(cb) { write.flush(() => { write.close(); cb() }) },
    destroy(err, cb) { write.close(); cb(err) }
  })
}
