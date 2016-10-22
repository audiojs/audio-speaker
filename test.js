var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('./index')

console.log('Starting test.')

var Speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
var buf = new AudioBuffer(1, LenaBuffer)

Speaker(buf, function (err, written) {
    console.log('Wrote (' + buf.length +')')
})
