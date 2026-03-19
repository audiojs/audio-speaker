/**
 * Miniaudio backend — our own N-API addon wrapping miniaudio.h
 */
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

let addon
try {
  addon = require(join(__dirname, '../../build/Release/speaker.node'))
} catch {
  addon = require(join(__dirname, '../../build/Debug/speaker.node'))
}

export function open({ sampleRate = 44100, channels = 2, bitDepth = 16, bufferSize = 50 } = {}) {
  const handle = addon.open(sampleRate, channels, bitDepth, bufferSize)
  const bytesPerFrame = (bitDepth / 8) * channels

  return {
    write(buf, cb) {
      const totalFrames = (buf.length / bytesPerFrame) | 0
      const written = addon.write(handle, buf)

      if (written >= totalFrames) {
        cb?.(null, written)
        return
      }

      // ring buffer full — retry remaining after short delay
      const remaining = buf.subarray(written * bytesPerFrame)
      const retry = () => {
        const avail = addon.available(handle)
        if (avail > 0) {
          this.write(remaining, cb)
        } else {
          setTimeout(retry, 1)
        }
      }
      setTimeout(retry, 1)
    },

    flush(cb) {
      const poll = () => {
        if (addon.flush(handle)) {
          cb?.()
        } else {
          setTimeout(poll, 5)
        }
      }
      poll()
    },

    close() {
      addon.close(handle)
    }
  }
}
