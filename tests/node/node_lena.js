'use strict'

var test = require('tape').only

var util = require('audio-buffer-utils')
var LenaBuffer = require('audio-lena/raw')
var AudioSpeaker = require('../../node')

test('play audio once test', t => {
  var speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
  var buf = util.create(LenaBuffer)

  speaker(buf, (err, chunk) => {
    if (err || chunk === true) {
      t.error(err, 'Write callback caught an unexpected error.')
    } else {
      speaker.end(true, (err) => {
        err ? t.error(err) : t.pass('Output successful.')
      })
    }
  })

  t.end()
})
