import test from 'tst'
import { ok, is } from 'tst'

const isBrowser = typeof window !== 'undefined'

if (isBrowser) test.manual = true

const { default: Speaker } = await import(isBrowser ? './browser.js' : './index.js')

const open = (opts) => isBrowser ? Speaker(opts) : Speaker(opts)

// generate PCM sine — snaps to full periods to avoid click at end
function sine(freq, durationMs, { sampleRate = 44100, channels = 2, bitDepth = 16 } = {}) {
  const bps = bitDepth / 8
  const period = sampleRate / freq
  const frames = Math.round(durationMs / 1000 * sampleRate / period) * Math.round(period)
  const buf = new Uint8Array(frames * channels * bps)
  const view = new DataView(buf.buffer)
  for (let i = 0; i < frames; i++) {
    const val = Math.sin(2 * Math.PI * freq * i / sampleRate)
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
