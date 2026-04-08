/**
 * Backend detection — static imports, open() tries in priority order
 */
import { open as miniaudioOpen } from './backends/miniaudio.js'
import { open as processOpen } from './backends/process.js'
import { open as nullOpen } from './backends/null.js'

const backends = [
  { name: 'miniaudio', open: miniaudioOpen },
  { name: 'process', open: processOpen },
  { name: 'null', open: nullOpen },
]

export function open(opts, preference) {
  const order = preference
    ? backends.filter(b => b.name === preference)
    : backends
  let lastErr

  for (const { name, open } of order) {
    try { return { name, device: open(opts) } }
    catch (e) { lastErr = e }
  }

  throw new Error(
    'No audio backend available. Install @audio/speaker-* for your platform or run npm run build.' +
    (lastErr ? ` Last error: ${lastErr.message}` : '')
  )
}
