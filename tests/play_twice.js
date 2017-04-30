var test = require('tape')

var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('../index')

test('play audio twice test', function(t) {
  var Speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true, autoFlush: true })
  var buf = new AudioBuffer(1, LenaBuffer)

  Speaker(buf, function (err, written) {
    err ? t.error(err, 'Write callback caught an unexpected error.') : t.pass('Test wrote ' + buf.length +' bytes of audio-lena.')
    Speaker(buf, function (err, done) {
      err ? t.error(err, 'Write callback caught an unexpected error.') : t.pass('Test wrote ' + (buf.length * 2) +' bytes of audio-lena.')
      Speaker.end(false, (err) => {
        err ? t.error(err) : t.pass('Output successful.')
        t.end()
      })
    })
  })
})
