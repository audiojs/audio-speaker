/**
 * Null backend — silent fallback for headless/CI environments.
 * Maintains the timing contract: callback fires after the audio duration,
 * preserving correct pacing for real-time render loops.
 */
export function open({ sampleRate = 44100, channels = 2, bitDepth = 16 } = {}) {
  const bytesPerFrame = channels * (bitDepth / 8)
  let closed = false

  return {
    write(buf, cb) {
      if (closed) return cb?.(new Error('closed'))
      const frames = (buf.length / bytesPerFrame) | 0
      setTimeout(() => cb?.(null, frames), frames / sampleRate * 1000)
    },
    flush(cb) { cb?.() },
    close() { closed = true }
  }
}
