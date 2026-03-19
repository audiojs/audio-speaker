/**
 * Miniaudio backend — our own N-API addon wrapping miniaudio.h
 *
 * Load order:
 * 1. @audio/speaker-{platform}-{arch} (platform package, no compilation)
 * 2. prebuilds/{platform}-{arch}/ (prebuildify)
 * 3. build/Release/ or build/Debug/ (local node-gyp build)
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
  () => require(join(root, 'prebuilds', plat, 'audio-speaker.node')),
  () => require(join(root, 'prebuilds', plat, 'speaker.node')),
  () => require(join(root, 'build', 'Release', 'speaker.node')),
  () => require(join(root, 'build', 'Debug', 'speaker.node')),
]
for (const load of loaders) {
  try { addon = load(); break } catch {}
}
if (!addon) throw new Error('miniaudio addon not found — install @audio/speaker-' + plat + ' or run npm run build')

export function open({ sampleRate = 44100, channels = 2, bitDepth = 16, bufferSize = 50, capture = false } = {}) {
  const handle = addon.open(sampleRate, channels, bitDepth, bufferSize, capture)

  return {
    // async write — entire buffer written on worker thread, cb when done
    write(buf, cb) {
      addon.write(handle, buf, (err, written) => cb?.(err, written))
    },

    // read captured output (only if capture: true)
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
