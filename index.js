var os = require('os')
var binding = require('bindings')('binding')
var debug = require('debug')('speaker')

var endianess = 'function' == os.endianess ? os.endianess() : 'LE'

module.exports = exports = Speaker

function Speaker () {
  return function _create (opts) {
    debug('_create()')
    if (this.handler) {
      throw new Error('_create() was called more than once. Only one handler should exist')
    }

    this.samplesPerFrame = 1024
    this._closed = false;

    this._format(opts)

    var format = exports.getFormat(this);
    if (format === null) {
      throw new Error('Invalid format options')
    }

    this.blockAlign = this.bitDepth / 8 * this.channels

    this.handler = binding.create()

    if(this.handler !== null) {
      debug('_start(%o)', Object.values(opts))
      binding.open(this.handler, this.sampleRate, this.channels, format, function (success) {
        if(success != 1) {
          throw new Error('Could not start the audio output with these properties')
        } else {
          debug('Created and started handler successfully')
        }
      })
    }
  }

  function _format(opts) {
    debug('Format: Setting options - %o', Object.keys(opts))
    if (opts.channels !== null) {
      debug('Format: Setting %o - %o', 'channels', opts.channels)
      this.channels = opts.channels
    } else {
      debug('Format: Setting %o - %o', 'channels', 2)
      this.channels = 2
    }
    if (opts.bitDepth !== null) {
      debug('Format: Setting %o - %o', 'bitDepth', opts.bitDepth)
      this.bitDepth = opts.bitDepth
    } else {
      debug('Format: Setting %o - %o', 'bitDepth', opts.float ? 32 : 16)
      this.bitDepth = opts.float ? 32 : 16
    }
    if (opts.sampleRate !== null) {
      debug('Format: Setting %o - %o', 'sampleRate', opts.sampleRate)
      this.sampleRate = opts.sampleRate
    } else {
      debug('Format: Setting %o - %o', 'sampleRate', 44100)
      this.sampleRate = 44100
    }
    if (opts.signed !== null) {
      debug('Format: Setting %o - %o', 'signed', opts.signed)
      this.signed = opts.signed
    } else {
      debug('Format: Setting %o - %o', 'signed', opts.bitDepth != 8)
      this.signed = this.bitDepth != 8
    }
    if (opts.float !== null) {
      debug('Format: Setting %o - %o', 'float', opts.float)
      this.float = opts.float
    }
    if (opts.samplesPerFrame !== null) {
      debug('Format: Setting %o - %o', 'samplesPerFrame', opts.samplesPerFrame)
      this.samplesPerFrame = opts.samplesPerFrame
    }
    this.endianess = endianess;
    debug('Format: Settings applied')
  }

  function write (enc, buf, callback) {

  }

  function function end (flush, callback) {
    debug('end(%o)', flush)
    if (this._closed) return debug('_end() was called more than once. Already ended')

    if (this.handler) {
      if (flush) {
        debug('Flushing the audio output')
        binding.flush(this.handler, function (success) {
          if(success != 1) {
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
      binding.close(this.handler, callback)
      this.handler = null
    }
  }
}

exports.getFormat = function getFormat (format) {
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
