'use strict'

var test = require('tape')

var util = require('audio-buffer-utils')
var LenaBuffer = require('audio-lena/raw')
var createSpeaker = require('./')
var createGenerator = require('audio-generator/direct')


test('play noise', t => {
  var write = createSpeaker()

  let buffer = util.create(10000)
  util.noise(buffer)

  write(buffer, (err) => {
    if (err) {
      t.error(err, 'Write callback caught an unexpected error.')
    } else {
      if (createSpeaker.platform === 'node') {
        write.end(true, (err) => {
          err ? t.error(err) : t.pass('Output successful.')
          t.end()
        })
      } else {
        t.end()
      }
    }
  })
})


test('play lena', t => {
  var write = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
  var buf = util.create(LenaBuffer)

  write(buf, (err) => {
    if (err) {
      t.error(err, 'Write callback caught an unexpected error.')
    } else {
      if (createSpeaker.platform === 'node') {
        write.end(true, (err) => {
          err ? t.error(err) : t.pass('Output successful.')
          t.end()
        })
      } else {
        t.end()
      }
    }
  })
})


test('play lena autoflush', t => {
  var write = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true, autoFlush: true })
  var buf = util.create(LenaBuffer)

  write(buf, (err) => {
    if (err) {
      t.error(err, 'Write callback caught an unexpected error.')
    } else {
      if (createSpeaker.platform === 'node') {
        write.end(false, (err) => {
          err ? t.error(err) : t.pass('Output successful.')
          t.end()
        })
      } else {
        t.end()
      }
    }
  })
})


test('play sine', t => {
  var generate = createGenerator(time => {
    return Math.sin(Math.PI * 2 * time * 440)
  }, { duration: 4 })

  var write = createSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true });

  setTimeout(() => {
    if (createSpeaker.platform === 'node') {
      write.end(false, (err) => {
        err ? t.error(err) : t.pass('Output successful.')
        t.end()
      })
    } else {
      t.end()
    }
  }, 1000);

  (function loop (err) {
    if (err) {
      // Ignore errors as we are intentionally cutting this short.
      return
    } else {
      write(generate(), (err) => {
        loop(err)
      })
    }
  })();
})
