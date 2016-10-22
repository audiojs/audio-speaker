var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('./index')
var debug = require('debug')('test')

console.log('Starting test.')
var Speaker = AudioSpeaker({ float: false, bitDepth: 16, signed: true })
var buf = new AudioBuffer(1, LenaBuffer)

console.log('Writing audio.')
console.dir(Speaker)
Speaker(buf, function (err, chunk) {
})
