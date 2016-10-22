var AudioBuffer = require('audio-buffer')
var LenaBuffer = require('audio-lena/buffer')
var AudioSpeaker = require('./index')

console.log('Starting test.')

var Speaker = AudioSpeaker({ float: false, bitDepth: 16, signed: true })
var buf = new AudioBuffer(1, LenaBuffer)

Speaker(buf, function (err, chunk) {
  if(!err) {
    console.log('Wrote (' + chunk.length + '/' + buf.length +')')
  } else throw err
})
