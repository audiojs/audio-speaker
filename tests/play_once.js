var test = require('tape')

var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('../index')

test('play audio once test', function (t) {
  var speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
  var buf = new AudioBuffer(1, LenaBuffer)

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
