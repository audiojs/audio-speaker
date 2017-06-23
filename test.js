'use strict'

var test = require('tape')

var util = require('audio-buffer-utils')
var LenaBuffer = require('audio-lena/raw')
var createSpeaker = require('./')
var createGenerator = require('audio-generator/direct')


test('output audio buffer', t => {
  var write = createSpeaker()

  let buffer = util.create(10000)
  util.noise(buffer)

  write(buffer, (err) => {
    if (err) t.fail()
    t.end()
  })
})


test('play lena', t => {
  var speaker = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true, autoFlush: true })
  var buf = util.create(LenaBuffer)
  buf = util.slice(buf, 0, 44100)

  speaker(buf, (err, chunk) => {
    if (err) t.fail(err)
    speaker.end(false, (err) => {
      err ? t.error(err) : t.pass('Output successful.')
    })
    t.end()
  })
})


test('autoflush', t => {
  var speaker = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
  var buf = util.create(LenaBuffer)
  buf = util.slice(buf, 0, 44100)

  speaker(buf, (err, chunk) => {
    if (err) t.fail(err)
    speaker.end(true, (err) => {
      err ? t.error(err) : t.pass('Output successful.')
    })
    t.end()
  })
})


test('play sine for 4 seconds', t => {
  var generate = createGenerator(time => {
    return Math.sin(Math.PI * 2 * time * 440)
  }, { duration: 4 })

  var write = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true });

  setTimeout(() => {
    write.end(false, (err) => {
      if (err) t.fail(err)
      t.end()
    })
  }, 4000);

  (function loop (err, chunk) {
    if (err || chunk < 1) {
      return
    } else {
      write(generate(), (err, chunk) => {
        loop(err, chunk)
      })
    }
  })();
})
