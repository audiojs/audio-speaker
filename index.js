/** @module  audio-speaker/index */
'use strict'

var os = require('os')
var pcm = require('pcm-util')
var binding = require('audio-mpg123')
var objectAssign = require('object-assign')
var audioSink = require('audio-sink/direct')
var isAudioBuffer = require('is-audio-buffer')

var endianess = 'function' == os.endianess ? os.endianess() : 'LE'

module.exports = Speaker

/**
 * The Speaker function initializes a new audio handler,
 * then returns the write method to output audio to.
 *
 * @param {Object} opts options for the speaker
 * @return {Function} write write audio from a buffer or audiobuffer
 * @module Speaker
 * @api public
 */
function Speaker (opts) {
  var options = objectAssign({
    channels: 1,
    float: false,
    bitDepth: 16,
    signed: true,
    samplesPerFrame: 1024,
    sampleRate: 44100,
    endianess: endianess,
    autoFlush: true
  }, opts)

  if (options.handler) throw new Error('Speaker was called more than once. Only one handler should exist.')

  options._closed = false
  options._busy = false

  var format = Speaker.getFormat(options)
  if (!format) throw new Error('Invalid format options.')

  options.blockAlign = options.bitDepth / 8 * options.channels

  options.chunkSize = options.blockAlign * options.samplesPerFrame

  options.handler = binding.create((success) => {
    if(!success) throw new Error('Failed to create the audio handler.')
  })

  if (options.handler !== null) {
    binding.open(options.handler, options.sampleRate, options.channels, format, (success) => {
      if (!success) throw new Error('Could not start the audio output with these properties.')
    })
  }

  write.end = end
  write.sink = sink
  sink.end = end
  return write

  /**
   * The write function takes a buffer or audiobuffer and
   * writes it to the speaker output. If the chunks are too
   * large it will break it up and put the remainding chunks
   * into a queue.
   * NOTE: You can only write new chunks once the callback is
   * called with no errors.
   *
   * @param {AudioBuffer} chunk (or Buffer) containing the data to be output
   * @param {Function} callback callback with error and chunk parameters
   * @return void
   * @api public
   */
  function write (chunk, callback) {
    if (!callback) callback = noop

    if (options._closed) return callback(new Error('Write cannot occur after the speaker is closed.'))
    if (chunk && options._busy) callback(new Error('Write cannot occur until the speaker has cleared its buffer.'))

    next(chunk, null, callback)

    function next (chunk, remainder, callback) {
      if (options.handler) {
        options._busy = true

        var chunkBuf = isAudioBuffer(chunk) ? Buffer.from(pcm.toArrayBuffer(chunk, options)) : chunk || new Buffer(0)
        var remainderBuf = isAudioBuffer(remainder) ? Buffer.from(pcm.toArrayBuffer(remainder, options)) : remainder || new Buffer(0)

        var queue = Buffer.concat([remainderBuf, chunkBuf], remainderBuf.length + chunkBuf.length)

        var output = queue.length > options.chunkSize ? queue.slice(0, options.chunkSize) : queue
        var remaining = queue.length > options.chunkSize ? queue.slice(options.chunkSize, queue.length) : new Buffer(0)

        binding.write(options.handler, output, output.length, (written) => {
          if(!remaining.length < 1) {
            next(null, remaining, callback)
          } else {
            if (options.autoFlush && remaining.length < options.chunkSize) {
              binding.flush(options.handler, function (success) {
                options._busy = false
                if (!success) {
                  callback('Could not flush the audio output.')
                } else {
                  callback(null)
                }
              })
            } else {
              options._busy = false
              callback(null)
            }
          }
        })
      } else {
        callback(new Error('Could not write remaining chunks as the speaker is closed.'))
      }
    }
  }

  function sink (callback) {
    return audioSink((data, callback) => {
      if (options._closed) return callback(true)
      setTimeout(callback, options.samplesPerFrame / options.sampleRate)
    })
  }

  /**
   * The end function closes the speaker and stops
   * it from writing anymore data. The output data
   * that was already written will be flushed if the
   * auto flush option is set.
   * NOTE: You cannot write anymore data after closing the speaker.
   *
   * @return void
   * @api public
   */
  function end () {
    if (options._closed) return

    if (options.handler) {
      if (options.autoFlush) {
        binding.flush(options.handler, (success) => {
          if (!success) throw new Error('Could not flush the audio output.')
          return close()
        })
      } else {
        return close()
      }
    } else {
      throw new Error('Audio handler was not initialized.')
    }

    function close () {
      binding.close(options.handler, (success) => {
        if (!success) throw new Error('Could not close the speaker.')
        options._closed = true
        options.handler = null
      })
    }
  }
}

Speaker.getFormat = (format) => {
  var f = null;
  if (format.bitDepth == 32 && format.float && format.signed) {
    f = binding.MPG123_ENC_FLOAT_32;
  } else if (format.bitDepth == 64 && format.float && format.signed) {
    f = binding.MPG123_ENC_FLOAT_64;
  } else if (format.bitDepth == 8 && format.signed) {
    f = binding.MPG123_ENC_SIGNED_8;
  } else if (format.bitDepth == 8 && !format.signed) {
    f = binding.MPG123_ENC_UNSIGNED_8;
  } else if (format.bitDepth == 16 && format.signed) {
    f = binding.MPG123_ENC_SIGNED_16;
  } else if (format.bitDepth == 16 && !format.signed) {
    f = binding.MPG123_ENC_UNSIGNED_16;
  } else if (format.bitDepth == 24 && format.signed) {
    f = binding.MPG123_ENC_SIGNED_24;
  } else if (format.bitDepth == 24 && !format.signed) {
    f = binding.MPG123_ENC_UNSIGNED_24;
  } else if (format.bitDepth == 32 && format.signed) {
    f = binding.MPG123_ENC_SIGNED_32;
  } else if (format.bitDepth == 32 && !format.signed) {
    f = binding.MPG123_ENC_UNSIGNED_32;
  }
  return f;
}


function noop () {}
