import test from 'tst'
import { ok, is } from 'tst'

const isBrowser = typeof window !== 'undefined'

if (isBrowser) test.manual = true

const { default: Speaker } = await import(isBrowser ? './browser.js' : './index.js')

const open = (opts) => isBrowser ? Speaker(opts) : Speaker(opts)

// generate PCM sine with fade in/out to avoid clicks
const FADE_MS = 5
function sine(freq, durationMs, { sampleRate = 44100, channels = 2, bitDepth = 16 } = {}) {
  const bps = bitDepth / 8
  const frames = Math.round(durationMs / 1000 * sampleRate)
  const fadeFrames = Math.min(Math.round(FADE_MS / 1000 * sampleRate), frames / 2)
  const buf = new Uint8Array(frames * channels * bps)
  const view = new DataView(buf.buffer)
  for (let i = 0; i < frames; i++) {
    let val = Math.sin(2 * Math.PI * freq * i / sampleRate)
    // fade envelope
    if (i < fadeFrames) val *= i / fadeFrames
    else if (i >= frames - fadeFrames) val *= (frames - 1 - i) / fadeFrames
    const sample = Math.max(-32768, Math.min(32767, Math.round(val * 32767)))
    for (let ch = 0; ch < channels; ch++) {
      view.setInt16((i * channels + ch) * bps, sample, true)
    }
  }
  return isBrowser ? buf : Buffer.from(buf.buffer)
}

// helper: write + flush + close
function play(write, buf) {
  return new Promise((resolve, reject) => {
    write(buf, (err) => {
      if (err) return reject(err)
      write.flush(() => { write.close(); resolve() })
    })
  })
}

// --- core ---

test('play sine', async () => {
  const write = await open()
  ok(write.backend, 'has backend')
  await play(write, sine(440, 100))
})

test('null ends playback', async () => {
  const write = await open()
  await new Promise((resolve, reject) => {
    write(sine(440, 50), (err) => {
      if (err) return reject(err)
      write(null, () => resolve())
    })
  })
})

test('multiple chunks', async () => {
  const write = await open()
  const chunk = sine(660, 25)
  let n = 0
  await new Promise((resolve, reject) => {
    ;(function next() {
      if (n >= 4) return write.flush(() => { write.close(); resolve() })
      write(chunk, (err) => { if (err) return reject(err); n++; next() })
    })()
  })
  is(n, 4)
})

test('double close is safe', async () => {
  const write = await open()
  await play(write, sine(440, 30))
  write.close() // second close — should not throw
})

// --- formats ---

test('mono', async () => {
  const write = await open({ channels: 1 })
  await play(write, sine(880, 100, { channels: 1 }))
})

test('48kHz', async () => {
  const opts = { sampleRate: 48000 }
  const write = await open(opts)
  await play(write, sine(440, 100, opts))
})

test('22050Hz sample rate', async () => {
  const opts = { sampleRate: 22050 }
  const write = await open(opts)
  await play(write, sine(440, 100, opts))
})

test('4 channels', async () => {
  const opts = { channels: 4 }
  const write = await open(opts)
  await play(write, sine(440, 100, opts))
})

test('6 channels (5.1)', async () => {
  const opts = { channels: 6 }
  const write = await open(opts)
  await play(write, sine(440, 100, opts))
})

test('96kHz sample rate', async () => {
  const opts = { sampleRate: 96000 }
  const write = await open(opts)
  await play(write, sine(440, 100, opts))
})

test('different frequencies', async () => {
  const write = await open()
  for (const freq of [220, 440, 880, 1760]) {
    await new Promise((resolve, reject) => {
      write(sine(freq, 50), (err) => err ? reject(err) : resolve())
    })
  }
  write.flush(() => write.close())
})

// --- edge cases ---

test('small buffer (single period)', async () => {
  const write = await open()
  // ~2ms of 440Hz = ~1 period
  await play(write, sine(440, 5))
})

test('large buffer (1s)', async () => {
  const write = await open()
  await play(write, sine(440, 1000))
})

test('write after flush', async () => {
  const write = await open()
  await new Promise((resolve, reject) => {
    write(sine(440, 50), (err) => {
      if (err) return reject(err)
      write.flush(() => resolve())
    })
  })
  // write more after flush
  await play(write, sine(660, 50))
})

// --- Node-only ---

if (!isBrowser) {
  test('stream: highWaterMark matches ring buffer', async () => {
    const { default: SpeakerStream } = await import('./stream.js')
    const speaker = new SpeakerStream({ sampleRate: 44100, channels: 2, bitDepth: 16, bufferSize: 50 })
    // 50ms × 44100Hz × 2ch × 2bytes = 8820 bytes
    is(speaker.writableHighWaterMark, 8820)
    speaker.destroy()
    await new Promise(resolve => speaker.on('close', resolve))
  })

  test('backpressure: write blocks until ring buffer drains', async () => {
    const write = await Speaker({ bufferSize: 50 })
    // write 500ms of audio into 50ms buffer — should take ~500ms (real-time)
    const bigBuf = sine(440, 500)
    const start = performance.now()
    await new Promise((resolve, reject) => {
      write(bigBuf, (err) => err ? reject(err) : write.flush(() => { write.close(); resolve() }))
    })
    const elapsed = performance.now() - start
    ok(elapsed > 400, 'write took ' + elapsed.toFixed(0) + 'ms (expected ~500ms)')
  })

  test('stream: pipe writable', async () => {
    const { default: SpeakerStream } = await import('./stream.js')
    const { Readable } = await import('node:stream')
    const { pipeline } = await import('node:stream/promises')

    const chunk = sine(440, 25)
    let n = 0
    const source = new Readable({
      read() {
        if (n >= 4) return this.push(null)
        this.push(chunk)
        n++
      }
    })

    await pipeline(source, new SpeakerStream())
  })

  test('explicit miniaudio backend', async () => {
    const write = await Speaker({ backend: 'miniaudio' })
    is(write.backend, 'miniaudio')
    await play(write, sine(440, 50))
  })

  test('stream: destroy mid-playback', async () => {
    const { default: SpeakerStream } = await import('./stream.js')
    const speaker = new SpeakerStream()
    speaker.write(sine(440, 100))
    speaker.destroy()
    // should not throw or hang
    await new Promise(resolve => speaker.on('close', resolve))
  })

  // capture tests require real audio device — skip in CI (null backend has different sample rate)
  const isCI = !!process.env.CI

  test('capture: verify output matches input', { skip: isCI }, async () => {
    const { open } = await import('./src/backends/miniaudio.js')
    const device = open({ sampleRate: 44100, channels: 1, bitDepth: 16, capture: true })

    // write a known 440Hz sine
    const frames = 4410 // 100ms
    const buf = sine(440, 100, { channels: 1 })

    await new Promise((resolve, reject) => {
      device.write(buf, (err) => {
        if (err) return reject(err)
        device.flush(() => resolve())
      })
    })

    // read captured output
    const capBuf = Buffer.alloc(frames * 2) // 1ch × 16-bit
    const capFrames = device.read(capBuf)
    device.close()

    ok(capFrames > 0, 'captured ' + capFrames + ' frames')

    // verify signal: captured samples should match input (non-silence)
    let maxSample = 0
    for (let i = 0; i < capFrames; i++) {
      const sample = Math.abs(capBuf.readInt16LE(i * 2))
      if (sample > maxSample) maxSample = sample
    }
    ok(maxSample > 1000, 'captured signal is non-silent (max=' + maxSample + ')')

    // verify frequency: count zero crossings to confirm correct pitch
    // 440Hz at 44100Hz for 4410 frames = 100ms = 44 full cycles = ~88 zero crossings
    let crossings = 0
    for (let i = 1; i < capFrames; i++) {
      const prev = capBuf.readInt16LE((i - 1) * 2)
      const curr = capBuf.readInt16LE(i * 2)
      if ((prev <= 0 && curr > 0) || (prev >= 0 && curr < 0)) crossings++
    }
    // expect ~88 crossings (±10% for phase offset at edges)
    ok(crossings > 70 && crossings < 110, 'frequency check: ' + crossings + ' zero crossings (~88 expected)')
  })

  test('capture: no discontinuities in long buffer', { skip: isCI }, async () => {
    const { open } = await import('./src/backends/miniaudio.js')
    const device = open({ sampleRate: 44100, channels: 1, bitDepth: 16, bufferSize: 100, capture: true })

    // 1s sine — long enough to wrap around ring buffer multiple times
    const durationMs = 1000
    const sampleRate = 44100
    const freq = 440
    const frames = Math.round(durationMs / 1000 * sampleRate)
    const buf = Buffer.alloc(frames * 2)
    for (let i = 0; i < frames; i++) {
      const val = Math.sin(2 * Math.PI * freq * i / sampleRate)
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(val * 32767))), i * 2)
    }

    await new Promise((resolve, reject) => {
      device.write(buf, (err) => {
        if (err) return reject(err)
        device.flush(() => resolve())
      })
    })

    // read all captured output
    const capBuf = Buffer.alloc(frames * 2)
    const capFrames = device.read(capBuf)
    device.close()

    ok(capFrames > frames * 0.9, 'captured enough frames: ' + capFrames + '/' + frames)

    // detect discontinuities: adjacent samples shouldn't jump more than expected
    // max delta for 440Hz sine at 44100Hz: sin changes by ~2π×440/44100 per sample ≈ 0.0627
    // in int16: ~0.0627 × 32767 ≈ 2055. Allow 3x margin for safety.
    const maxAllowedDelta = 2055 * 3
    let glitches = 0
    let maxDelta = 0
    for (let i = 1; i < capFrames; i++) {
      const prev = capBuf.readInt16LE((i - 1) * 2)
      const curr = capBuf.readInt16LE(i * 2)
      const delta = Math.abs(curr - prev)
      if (delta > maxDelta) maxDelta = delta
      if (delta > maxAllowedDelta) glitches++
    }

    ok(glitches === 0, glitches + ' discontinuities found (max delta=' + maxDelta + ')')
  })

  test('AudioBuffer input', async () => {
    // simulate AudioBuffer with getChannelData/numberOfChannels/length
    const frames = 4410
    const data = new Float32Array(frames)
    for (let i = 0; i < frames; i++) {
      data[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
    }
    const ab = {
      numberOfChannels: 1,
      sampleRate: 44100,
      length: frames,
      getChannelData: () => data
    }

    const write = await Speaker({ channels: 1 })
    await play(write, ab)
  })
}
