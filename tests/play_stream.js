var test = require('tape')

var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('../stream')
var AudioThrough = require('audio-through')

test('play node stream audio', function(t) {
  var buf = new AudioBuffer(1, LenaBuffer)
  var Speaker = new AudioSpeaker()

  var through = new AudioThrough(function (buffer) {
    return through.count > 1 ? through.end().on('finish', finish()) : buf

    function finish () {
      Speaker.end(true)
      t.pass('Output successful.')
      t.end()
    }
  })

  through.pipe(Speaker)
})
