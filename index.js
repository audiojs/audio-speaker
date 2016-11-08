/** @module  audio-speaker/index */

'use strict'

var os = require('os')
var objectAssign = require('object-assign')
var binding = require('audio-mpg123')
var pcm = require('pcm-util')
var isAudioBuffer = require('is-audio-buffer')
var audioSink = require('audio-sink/direct')
var debug = require('debug')('speaker')

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
  debug('Speaker()')
  var options = {}

  options = objectAssign({
    channels: 1,
    float: false,
    bitDepth: 16,
    signed: true,
    samplesPerFrame: 1024,
    sampleRate: 44100,
    endianess: endianess,
    autoFlush: false
  }, opts)

  if (options.handler) {
    throw new Error('_create() was called more than once. Only one handler should exist.')
  }

  options._closed = false
  options._busy = false

  var format = Speaker.getFormat(options)
  if (format === null) {
    throw new Error('Invalid format options.')
  }

  options.blockAlign = options.bitDepth / 8 * options.channels

  options.chunkSize = options.blockAlign * options.samplesPerFrame

  options.handler = binding.create((success) => {
    if(!success) {
      throw new Error('Failed to create the audio handler.')
    } else {
      debug('_create() audio handle successfully.')
    }
  })

  if (options.handler !== null) {
    debug('_start(%o)', Object.keys(options))
    binding.open(options.handler, options.sampleRate, options.channels, format, function (success) {
      if (!success) {
        throw new Error('Could not start the audio output with these properties.')
      } else {
        debug('Created and started handler successfully.')
      }
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
    debug('write()')
    if (options._closed) return debug('write() cannot be called after the speaker is closed.')
    if (chunk && options._busy) return debug('write() cannot be called until the previous buffer has been written.')

    next(chunk, null, callback)

    function next (chunk, remainder, callback) {
      if (options.handler) {
        options._busy = true

        var chunkBuf = isAudioBuffer(chunk) ? pcm.toBuffer(chunk, options) : chunk || new Buffer(0)
        var remainderBuf = isAudioBuffer(remainder) ? pcm.toBuffer(remainder, options) : remainder || new Buffer(0)

        var queue = Buffer.concat([remainderBuf, chunkBuf], remainderBuf.length + chunkBuf.length)

        debug("%o bytes total queued for output.", queue.length)

        var output = queue.length > options.chunkSize ? queue.slice(0, options.chunkSize) : queue
        var remaining = queue.length > options.chunkSize ? queue.slice(options.chunkSize, queue.length) : new Buffer(0)

        debug("%o bytes writing to the speaker.", output.length)
        debug("%o bytes remaining in the queue.", remaining.length)

        binding.write(options.handler, output, output.length, onWrite)

        function onWrite (written) {
          debug('Wrote %o bytes this chunk.', written)
          if(!remaining.length < 1) {
            debug('Writing remaining chunks.')
            next(null, remaining, callback)
          } else {
            debug('Finished writing chunk.')
            if (options.autoFlush && remaining.length < 1) {
              debug('Flushing the audio output.')
              binding.flush(options.handler, function (success) {
                if (success != 1) {
                  debug('Could not flush the audio output.')
                  options._busy = false
                  callback(new Error('Could not flush the audio output.'), written)
                } else {
                  debug('Flushed audio successfully.')
                  options._busy = false
                  callback(null, written)
                }
              })
            } else {
              options._busy = false
              callback(null, written)
            }
          }
        }
      }
    }
  }

  function sink (callback) {
    debug('sink()')

    return audioSink((data, callback) => {
      if (options._closed) return callback(true)
      setTimeout(callback, options.samplesPerFrame / options.sampleRate)
    })
  }

  /**
   * The end function closes the speaker and stops
   * it from writing anymore data. The output data
   * that was already written can be optionally flushed.
   * NOTE: You cannot write anymore data after closing the speaker.
   *
   * @param {Boolean} flush flushes the written data (default is false)
   * @param {Function} callback callback with error parameter
   * @return void
   * @api public
   */
  function end (flush, callback) {
    debug('end(%o)', flush)
    if (options._closed) return debug('_end() was called more than once. Already ended.')

    if (options.handler) {
      if (flush) {
        debug('Flushing the audio output.')
        binding.flush(options.handler, function (success) {
          if (success != 1) {
            debug('Could not flush the audio output.')
          } else {
            return close(callback)
          }
        })
      } else {
        return close(callback)
      }
    } else {
      debug('Could not flush the audio output because handler does not exist.')
    }

    function close (callback) {
      debug('close()')
      binding.close(options.handler, (success) => {
        if (callback) {
          success ? callback() : callback(new Error('Failed to close speaker.'))
        }
      })
      options._closed = true
      options.handler = null
    }
  }
}

Speaker.getFormat = function getFormat (format) {
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
