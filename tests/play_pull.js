var test = require('tape')

var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var pull = require('pull-stream')
var AudioSpeaker = require('../pull')

test('play pull stream audio', function(t) {
  var buf = new AudioBuffer(1, LenaBuffer)

  function input () {
    return function (end, callback) {
      var plays = 0;

      if (plays > 1 || end) {
        t.pass('Output successful.')
        t.end()
        return callback(end)
      }

      plays++
      return callback(null, buf)
    }
  }

  pull(input(), AudioSpeaker())
})
