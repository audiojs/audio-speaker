var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var pull = require('pull-stream')
var AudioSpeaker = require('../pull')

console.log('Starting test four.')

var buf = new AudioBuffer(1, LenaBuffer)

function input () {
  return function (end, callback) {
    var plays = 0;
    if (end) return callback(end)

    if (plays > 1) {
      AudioSpeaker.abort()
      console.log('Finished test four.')
      return callback(true, null)
    }
    plays++
    return callback(null, buf)
  }
}

pull(input(), AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true }))
