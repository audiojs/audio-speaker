var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('../index')

console.log('Starting test one.')

var Speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
var buf = new AudioBuffer(1, LenaBuffer)

Speaker(buf, null, function (err, written) {
    console.log('Test wrote ' + buf.length +' bytes of audio-lena.')
    Speaker.end(true, (success) => {
      console.log('Finished test one.')
    })
})
