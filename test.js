'use strict'

var test = require('tape')

var util = require('audio-buffer-utils')
var LenaBuffer = require('audio-lena/raw')
var createSpeaker = require('./')
var createGenerator = require('audio-generator/direct')


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
    return Math.sin(Math.PI * 2 * time * 440)
  }, { duration: 1, channels: 1 })

  var write = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true, autoFlush: false });

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
