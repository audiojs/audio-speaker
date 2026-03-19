/**
 * Process backend — pipe PCM to system audio tools (last resort)
 */
import { spawn, execSync } from 'node:child_process'
import { platform } from 'node:os'

function findPlayer(sampleRate, channels, bitDepth) {
  const os = platform()
  const fmt = `s${bitDepth}le`

  // ffplay: best cross-platform option, handles stdin PCM
  try {
    execSync('ffplay -version', { stdio: 'ignore' })
    return ['ffplay', ['-nodisp', '-autoexit', '-f', fmt, '-ar', sampleRate, '-ac', channels, '-']]
  } catch {}

  // sox/play
  try {
    execSync('play --version', { stdio: 'ignore' })
    return ['play', ['-t', 'raw', '-r', sampleRate, '-c', channels, '-b', bitDepth, '-e', 'signed-integer', '-L', '-']]
  } catch {}

  // platform-specific
  if (os === 'linux') {
    try {
      execSync('aplay --version', { stdio: 'ignore' })
      return ['aplay', ['-f', fmt, '-r', sampleRate, '-c', channels]]
    } catch {}
  }

  if (os === 'darwin') {
    // afplay doesn't support stdin, skip
  }

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
