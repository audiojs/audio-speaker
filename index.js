var os = require('os')
var binding = require('bindings')('binding')
var debug = require('debug')('speaker')

var endianess = 'function' == os.endianess ? os.endianess() : 'LE'

module.exports = Speaker

function Speaker (opts) {
  return function _create () {
    debug('_create()')
    if (opts.handler) {
      throw new Error('_create() was called more than once. Only one handler should exist')
    }

    opts._closed = false;

    _validate(opts)

    var format = exports.getFormat(opts);
    if (format === null) {
      throw new Error('Invalid format options')
    }

    opts.blockAlign = opts.bitDepth / 8 * opts.channels

    opts.handler = binding.create()

    if (opts.handler !== null) {
      debug('_start(%o)', Object.values(opts))
      binding.open(opts.handler, opts.sampleRate, opts.channels, format, function (success) {
        if (success != 1) {
          throw new Error('Could not start the audio output with these properties')
        } else {
          debug('Created and started handler successfully')
        }
      })
    }
  }

  function _validate (opts) {
    debug('Format: Setting options - %o', Object.keys(opts))
    if (opts.channels !== null) {
      debug('Format: Setting %o - %o', 'channels', opts.channels)
    } else {
      debug('Format: Setting %o - %o', 'channels', 2)
      opts.channels = 2
    }
    if (opts.bitDepth !== null) {
      debug('Format: Setting %o - %o', 'bitDepth', opts.bitDepth)
    } else {
      debug('Format: Setting %o - %o', 'bitDepth', opts.float ? 32 : 16)
      opts.bitDepth = opts.float ? 32 : 16
    }
    if (opts.sampleRate !== null) {
      debug('Format: Setting %o - %o', 'sampleRate', opts.sampleRate)
    } else {
      debug('Format: Setting %o - %o', 'sampleRate', 44100)
      opts.sampleRate = 44100
    }
    if (opts.signed !== null) {
      debug('Format: Setting %o - %o', 'signed', opts.signed)
    } else {
      debug('Format: Setting %o - %o', 'signed', opts.bitDepth != 8)
      opts.signed = opts.bitDepth != 8
    }
    if (opts.samplesPerFrame !== null) {
      debug('Format: Setting %o - %o', 'samplesPerFrame', opts.samplesPerFrame)
    } else {
      debug('Format: Settings &o - %o', 'samplesPerFrame', 1024)
      opts.samplesPerFrame = 1024
    }
    if (opts.float !== null) {
      debug('Format: Setting %o - %o', 'float', opts.float)
    }
    opts.endianess = endianess;
    debug('Format: Settings applied')
  }

  function write (buf, callback) {

  }

  function function end (flush, callback) {
    debug('end(%o)', flush)
    if (opts._closed) return debug('_end() was called more than once. Already ended')

    if (opts.handler) {
      if (flush) {
        debug('Flushing the audio output')
        binding.flush(opts.handler, function (success) {
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
      binding.close(opts.handler, callback)
      opts.handler = null
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
