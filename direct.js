'use strict'

var os = require('os')
var objectAssign = require('object-assign')
var binding = require('bindings')('binding')
var pcm = require('pcm-util')
var isAudioBuffer = require('is-audio-buffer')
var audioBuffer = require('audio-buffer')
var audioSink = require('audio-sink/direct')
var debug = require('debug')('speaker')

var endianess = 'function' == os.endianess ? os.endianess() : 'LE'

module.exports = Speaker

function Speaker (opts) {
  debug('Speaker()')
  var options = {}

  objectAssign(options, opts)

  if (options.handler) {
    throw new Error('_create() was called more than once. Only one handler should exist.')
  }

  options._closed = false
  options._busy = false

  _validate(options)

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
  return options.sink ? sink : write

  function write (chunk, remainder, callback) {
    debug('write()')
    if (options._closed) return debug('write() cannot be called after the speaker is closed.')
    if (chunk && options._busy) return debug('write() cannot be called until the previous buffer has been written.')

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
          write(null, remaining, callback)
        } else {
          debug('Finished writing chunk.')
          if (options.autoFlush) {
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

  function sink () {
    if (options._closed) return callback(true)

    return audioSink((data, callback) => {
      setTimeout(callback, samplesPerFrame / sampleRate)
    })
  }

  function _validate (options) {
    debug('Format: Setting options - %o', Object.keys(options))
    if (options.autoFlush !== undefined) {
      debug('Format: Setting %o - %o', 'autoFlush', options.autoFlush)
    } else {
      debug('Format: Setting %o - %o', 'autoFlush', false)
      options.autoFlush = false
    }
    if (options.channels !== undefined) {
      debug('Format: Setting %o - %o', 'channels', options.channels)
    } else {
      debug('Format: Setting %o - %o', 'channels', 2)
      options.channels = 2
    }
    if (options.bitDepth !== undefined) {
      debug('Format: Setting %o - %o', 'bitDepth', options.bitDepth)
    } else {
      debug('Format: Setting %o - %o', 'bitDepth', options.float ? 32 : 16)
      options.bitDepth = options.float ? 32 : 16
    }
    if (options.sampleRate !== undefined) {
      debug('Format: Setting %o - %o', 'sampleRate', options.sampleRate)
    } else {
      debug('Format: Setting %o - %o', 'sampleRate', 44100)
      options.sampleRate = 44100
    }
    if (options.signed !== undefined) {
      debug('Format: Setting %o - %o', 'signed', options.signed)
    } else {
      debug('Format: Setting %o - %o', 'signed', options.bitDepth != 8)
      options.signed = options.bitDepth != 8
    }
    if (options.samplesPerFrame !== undefined) {
      debug('Format: Setting %o - %o', 'samplesPerFrame', options.samplesPerFrame)
    } else {
      debug('Format: Settings %o - %o', 'samplesPerFrame', 1024)
      options.samplesPerFrame = 1024
    }
    if (options.float !== undefined) {
      debug('Format: Setting %o - %o', 'float', options.float)
    }
    options.endianess = endianess;
    debug('Format: Settings applied')
  }

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
      if (callback) {
        binding.close(options.handler, callback)
      } else {
        binding.close(options.handler, (success) => {
          if (success != 1) throw new Error('Failed to close speaker.')
        })
      }
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
