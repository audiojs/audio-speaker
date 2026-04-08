/**
 * Miniaudio backend — own N-API addon wrapping miniaudio.h
 *
 * Write strategy:
 * - writeSync: non-blocking memcpy into ring buffer (zero overhead)
 * - writeAsync: blocks on worker thread when ring buffer is full
 * - Small writes (real-time rendering) → pure sync, no event loop round-trip
 * - Large writes → sync partial + async remainder
 *
 * Load order:
 * 1. @audio/speaker-{platform}-{arch} (platform package)
 * 2. prebuilds/{platform}-{arch}/
 * 3. build/Release/ or build/Debug/ (local node-gyp)
 */
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { arch, platform } from 'node:os'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const plat = `${platform()}-${arch()}`

let addon
const loaders = [
  () => require(`@audio/speaker-${plat}`),
  () => require(join(root, 'packages', `speaker-${plat}`, 'speaker.node')),
  () => require(join(root, 'prebuilds', plat, 'audio-speaker.node')),
  () => require(join(root, 'prebuilds', plat, 'speaker.node')),
  () => require(join(root, 'build', 'Release', 'speaker.node')),
  () => require(join(root, 'build', 'Debug', 'speaker.node')),
]
for (const load of loaders) {
  try { addon = load(); break } catch {}
}

export function open({ sampleRate = 44100, channels = 2, bitDepth = 16, bufferSize = 50, capture = false } = {}) {
  if (!addon) throw new Error('miniaudio addon not found — install @audio/speaker-' + plat + ' or run npm run build')
  const handle = addon.open(sampleRate, channels, bitDepth, bufferSize, capture)

  return {
    // writeAsync blocks a worker thread until all data is written, then waits
    // until the ring buffer drains below pull_threshold before firing cb.
    // This means cb fires when the hardware *needs* more data — true pull pacing.
    write(buf, cb) {
      addon.writeAsync(handle, buf, (err, written) => cb?.(err, written))
    },

    read(buf) {
      return addon.read(handle, buf)
    },

    flush(cb) {
      const poll = () => {
        if (addon.flush(handle)) cb?.()
        else setTimeout(poll, 5)
      }
      poll()
    },

    close() {
      addon.close(handle)
    }
  }
}
