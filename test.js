import test from 'tst'
import util from 'audio-buffer-utils'
import LenaBuffer from 'audio-lena/raw'
import createSpeaker from './index-old'
import createGenerator from 'audio-generator/direct'


test('play noise', t => {
  t.plan(1)

  var write = createSpeaker()

  let buffer = util.create(10000)
  util.noise(buffer)

  write(buffer, (err) => {
    if (err) {
      t.error(err, 'Write callback caught an unexpected error.')
    } else {
      write.end()
      t.pass('Output successful.')
    }
  })
})


test('play lena', t => {
  t.plan(1)

  var write = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
  var buf = util.create(LenaBuffer)
  buf = util.slice(buf, 0, 44100)

  write(buf, (err) => {
    if (err) {
      t.error(err, 'Write callback caught an unexpected error.')
    } else {
      write.end()
      t.pass('Output successful.')
    }
  })
})

test('play sine', t => {
  t.plan(1)

  var generate = createGenerator(time => {
    return [
      Math.sin(Math.PI * 2 * time * 439),
      Math.sin(Math.PI * 2 * time * 441)
    ]
  }, { duration: 1, channels: 2 })

  var write = createSpeaker({ channels: 2, autoFlush: false });

  setTimeout(() => {
    write.end()
    t.pass('Output successful.')
  }, 500);

  (function loop (err) {
    if (err) {
      // Ignore errors as we are intentionally cutting this short.
      return
    } else {
      let buf = generate()
      write(buf, loop)
    }
  })();
})
