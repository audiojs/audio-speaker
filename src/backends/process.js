/**
 * Process backend — pipe PCM to system audio tools (last resort)
 */
import { spawn, execSync } from 'node:child_process'
import { platform } from 'node:os'

function tryExec(cmd) {
  try { execSync(cmd, { stdio: 'ignore' }); return true } catch { return false }
}

function findPlayer(sampleRate, channels, bitDepth) {
  const os = platform()
  const fmt = bitDepth === 8 ? 'u8' : bitDepth === 32 ? 'f32le' : `s${bitDepth}le`

  if (tryExec('ffplay -version'))
    return ['ffplay', ['-nodisp', '-autoexit', '-f', fmt, '-ar', sampleRate, '-ac', channels, '-']]

  if (tryExec('play --version'))
    return ['play', ['-t', 'raw', '-r', sampleRate, '-c', channels, '-b', bitDepth, '-e', 'signed-integer', '-L', '-']]

  if (os === 'linux' && tryExec('aplay --version'))
    return ['aplay', ['-f', fmt, '-r', sampleRate, '-c', channels]]

  return null
}

export function open({ sampleRate = 44100, channels = 2, bitDepth = 16 } = {}) {
  const player = findPlayer(sampleRate, channels, bitDepth)
  if (!player) throw new Error('No audio player found (install ffplay or sox)')

  const [cmd, args] = player
  const proc = spawn(cmd, args.map(String), { stdio: ['pipe', 'ignore', 'ignore'] })

  let closed = false

  proc.on('close', () => { closed = true })

  return {
    write(buf, cb) {
      if (closed) return cb?.(new Error('Process exited'))
      proc.stdin.write(buf, cb)
    },

    flush(cb) {
      if (closed) return cb?.()
      proc.stdin.end(() => cb?.())
    },

    close() {
      if (closed) return
      closed = true
      proc.stdin.end()
      proc.kill()
    }
  }
}
