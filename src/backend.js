/**
 * Backend detection — tries backends in priority order
 */
const backends = ['pvspeaker', 'miniaudio', 'process']

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
    'No audio backend available. ' +
    'Install @picovoice/pvspeaker-node or compile the native addon (npm run build).' +
    (lastErr ? ` Last error: ${lastErr.message}` : '')
  )
}
