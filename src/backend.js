/**
 * Backend detection — tries backends in priority order
 */
const backends = ['miniaudio', 'process']

export async function open(opts, preference) {
  const order = preference ? [preference] : backends
  let lastErr

  for (const name of order) {
    try {
      const mod = await import(`./backends/${name}.js`)
      const device = mod.open(opts)
      return { name, device }
    } catch (e) {
      lastErr = e
    }
  }

  throw new Error(
    'No audio backend available. Install @audio/speaker-* for your platform or run npm run build.' +
    (lastErr ? ` Last error: ${lastErr.message}` : '')
  )
}
