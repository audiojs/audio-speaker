'use strict'

var AudioBuffer = require('audio-buffer')
var AudioSink = require('audio-sink/direct')
var isAudioBuffer = require('is-audio-buffer')
var NativeSpeaker = require('./native')
var objectAssign = require('object-assign')

var format = {
  float: false,
  bitDepth: 16,
  signed: true,
  sampleRate: 44100,
  samplesPerFrame: 1024
};

module.exports = function (opts) {
  var options = objectAssign(options, format, opts)

  return !options.sink ? createNativeSpeaker(options) : createAudioSink(options)

  function createNativeSpeaker (options) {
    var Speaker = NativeSpeaker(options)
    var isClosed = false

    write.end = end
    return write

    function end () {
      isClosed = true
      write(true)
    }

    function write (chunk, callback) {
      if (chunk == null || chunk === true || isClosed) {
        isClosed = true
        callback(true)
      } else {
        var input = null
        if (isAudioBuffer(chunk) ? input = chunk : chunk = new AudioBuffer(options.channels, chunk, options.sampleRate))
        Speaker(input, null, (err, written) => {
          if (isClosed) {
            Speaker.end(options.autoFlush || true, (success) => {
              if (success) {
                callback(true)
              } else {
                callback(new Error('Could not end speaker.'))
              }
            })
          } else {
            callback(null, chunk)
          }
        })
      }
    }
  }

  function createAudioSink (options) {
    var isClosed = false

    sink.end = end
    return sink

    var sink = AudioSink((data, callback) => {
      if (isClosed || data == null || data == true) return callback(true)
      setTimeout(callback, samplesPerFrame / sampleRate)
    })

    function end () {
      isClosed = true
      sink(true)
    }
  }
}
