var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('../index')

console.log('Starting test one.')

var Speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true })
var buf = new AudioBuffer(1, LenaBuffer)

Speaker(buf, null, (err, chunk) => {
  if (err || chunk === true) {
    console.log('Finished test with errors.')
  } else {
    Speaker.end(true, (err) => {
      err ? console.log('Finished test with errors.') : console.log('Finished test with no errors.')
    })
  }
})
