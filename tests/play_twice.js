var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('../index')

console.log('Starting test two.')

var Speaker = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true, autoFlush: true })
var buf = new AudioBuffer(1, LenaBuffer)

Speaker(buf, null, function (err, written) {
    console.log('Test wrote ' + buf.length +' bytes of audio-lena.')
    Speaker(buf, null, function (err, done) {
      console.log('Test wrote ' + (buf.length * 2) + ' bytes of audio-lena total over two runs.')
      Speaker.end(false, (err) => {
        err ? console.log('Finished test two with errors.') : console.log('Finished test two with no errors.')
      })
    })
})
