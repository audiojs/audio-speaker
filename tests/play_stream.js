var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('../stream')
var AudioThrough = require('audio-through')

console.log('Starting test three.')

var Speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
var buf = new AudioBuffer(1, LenaBuffer)

var through = new AudioThrough(function (buffer) {
  return through.count > 1 ? through.end().on('finish', finish()) : buf

  function finish () {
    Speaker.end(true)
    console.log('Finished test three.')
  }
})

through.pipe(Speaker)
