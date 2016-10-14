var os = require('os')
var objectAssign = require('object-assign')
var binding = require('bindings')('binding')
var pcm = require('pcm-util')
var isAudioBuffer = require('is-audio-buffer')
var debug = require('debug')('speaker')

var endianess = 'function' == os.endianess ? os.endianess() : 'LE'

module.exports = Speaker

function Speaker (opts) {
  debug('Speaker()')
  var options = {}

  objectAssign(options, opts)

  if (options.handler) {
    throw new Error('_create() was called more than once. Only one handler should exist')
  }

  options._closed = false;

  _validate(options)

  var format = exports.getFormat(options);
  if (format === null) {
    throw new Error('Invalid format options')
  }

  options.blockAlign = options.bitDepth / 8 * options.channels

  options.chunkSize = options.blockAlign * options.samplesPerFrame

  options.handler = binding.create()

  if (options.handler !== null) {
    debug('_start(%o)', Object.values(options))
    binding.open(options.handler, options.sampleRate, options.channels, format, function (success) {
      if (success != 1) {
        throw new Error('Could not start the audio output with these properties')
      } else {
        debug('Created and started handler successfully')
      }
    })
  }

  return function write (chunk, callback) {
    debug('write() (%o bytes)', chunk.length)
    if (options._closed) return debug('write() cannot be called after the speaker is closed.')

    if (options.handler) {
      var buffer = isAudioBuffer(chunk) ? pcm.toBuffer(chunk, options) : chunk

      var current
      var remaining

      if (remaining.length > 0) {
        current = remaining
        remaining = chunk
      } else {
        current = chunk
        remaining = null
      }

      if (current.length > options.chunkSize) {
        var temp = current
        current = temp.slice(0, options.chunkSize)
        remaining = temp.slice(options.chunkSize)
      } else {
        remaining = null
      }

      debug('Writing %o byte chunk', current.length)
      binding.write(options.handler, current, current.length, )

      function onWrite (status, chunk) {
        debug('Wrote %o bytes', chunk.length)
        if (status != 1) {
          callback(new Error('write() failed when writing: ' + chunk), chunk)
        } else if (remaining) {
          debug('Writing %o remaining bytes in the chunk.', left.length)
          write()
        } else {
          debug('Finished writing chunk.')
          callback(null, chunk)
        }
      }
    }
  }

  function _validate (options) {
    debug('Format: Setting options - %o', Object.keys(options))
    if (options.channels !== null) {
      debug('Format: Setting %o - %o', 'channels', options.channels)
    } else {
      debug('Format: Setting %o - %o', 'channels', 2)
      options.channels = 2
    }
    if (options.bitDepth !== null) {
      debug('Format: Setting %o - %o', 'bitDepth', options.bitDepth)
    } else {
      debug('Format: Setting %o - %o', 'bitDepth', options.float ? 32 : 16)
      options.bitDepth = options.float ? 32 : 16
    }
    if (options.sampleRate !== null) {
      debug('Format: Setting %o - %o', 'sampleRate', options.sampleRate)
    } else {
      debug('Format: Setting %o - %o', 'sampleRate', 44100)
      options.sampleRate = 44100
    }
    if (options.signed !== null) {
      debug('Format: Setting %o - %o', 'signed', options.signed)
    } else {
      debug('Format: Setting %o - %o', 'signed', options.bitDepth != 8)
      options.signed = options.bitDepth != 8
    }
    if (options.samplesPerFrame !== null) {
      debug('Format: Setting %o - %o', 'samplesPerFrame', options.samplesPerFrame)
    } else {
      debug('Format: Settings &o - %o', 'samplesPerFrame', 1024)
      options.samplesPerFrame = 1024
    }
    if (options.float !== null) {
      debug('Format: Setting %o - %o', 'float', options.float)
    }
    options.endianess = endianess;
    debug('Format: Settings applied')
  }

  function function end (flush, callback) {
    debug('end(%o)', flush)
    if (options._closed) return debug('_end() was called more than once. Already ended')

    if (options.handler) {
      if (flush) {
        debug('Flushing the audio output')
        binding.flush(options.handler, function (success) {
          if (success != 1) {
            debug('Could not flush the audio output')
          } else {
            return close(callback)
          }
        })
      } else {
        return close(callback)
      }
    } else {
      debug('Could not flush the audio output because handler does not exist')
    }

    function close (callback) {
      debug('close()')
      binding.close(options.handler, callback)
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
