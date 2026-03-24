/**
 * Backend detection — static imports, tries in priority order
 */
let miniaudio, process_, null_

try { miniaudio = await import('./backends/miniaudio.js') } catch {}
try { process_ = await import('./backends/process.js') } catch {}
try { null_ = await import('./backends/null.js') } catch {}

const backends = [
  miniaudio && { name: 'miniaudio', open: miniaudio.open },
  process_ && { name: 'process', open: process_.open },
  null_ && { name: 'null', open: null_.open },
].filter(Boolean)

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
