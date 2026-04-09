/**
 * @module audio-speaker/browser
 *
 * Browser audio output via Web Audio API.
 */
export default function Speaker(opts = {}) {
  const ownCtx = !opts.context
  const ctx = opts.context || new AudioContext({
    sampleRate: opts.sampleRate || 44100
  })
  const channels = opts.channels || 2
  const sampleRate = ctx.sampleRate
  const bitDepth = opts.bitDepth || 16

  let closed = false

  write.end = () => close()
  write.flush = (cb) => cb?.()
  write.close = close
  write.backend = 'webaudio'

  return write

  function write(chunk, cb) {
    if (chunk == null || closed) {
      cb?.(null)
      return
    }

    // resume suspended context (autoplay policy)
    const ready = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()
    ready.then(() => playChunk(chunk, cb), cb)
  }

  function playChunk(chunk, cb) {
    const bytesPerSample = bitDepth / 8
    const frameCount = (chunk.length / bytesPerSample / channels) | 0
    const audioBuffer = ctx.createBuffer(channels, frameCount, sampleRate)

    for (let ch = 0; ch < channels; ch++) {
      const out = audioBuffer.getChannelData(ch)
      if (bitDepth === 16) {
        for (let i = 0; i < frameCount; i++) {
          const idx = (i * channels + ch) * 2
          out[i] = ((chunk[idx] | (chunk[idx + 1] << 8)) << 16 >> 16) / 32768
        }
      } else if (bitDepth === 32) {
        const f32 = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
        for (let i = 0; i < frameCount; i++) {
          out[i] = f32.getFloat32((i * channels + ch) * 4, true)
        }
      }
    }

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.onended = () => cb?.(null, frameCount)
    source.start()
  }

  function close() {
    if (closed) return
    closed = true
    if (ownCtx) ctx.close?.()
  }
}

/**
 * Consume an async iterable of PCM chunks through the speaker.
 * @param {AsyncIterable} source - async iterable yielding PCM buffers
 * @param {object} opts - speaker options (sampleRate, channels, bitDepth, etc.)
 * @returns {Promise<void>} resolves when source is exhausted
 */
Speaker.from = async function(source, opts) {
  const write = Speaker(opts)
  try {
    for await (let chunk of source) {
      await new Promise((resolve, reject) => write(chunk, err => err ? reject(err) : resolve()))
    }
  } finally {
    write(null)
  }
}
