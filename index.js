/** @module  audio-speaker/index */
'use strict'

var convert = require('pcm-convert')
var binding = require('audio-mpg123')
var isAudioBuffer = require('is-audio-buffer')
function noop () {}

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
  var options = Object.assign({
    channels: 1,
    sampleRate: 44100,
    format: 'int16',
    autoFlush: true
  }, opts)

  var format = Speaker.getFormat(options.format)
  if (!format) throw new Error('Invalid format options.')

  // Options we use directly
  var channels = options.channels
  var sampleRate = options.sampleRate
  var autoFlush = options.autoFlush

  // Writing state
  var busy = false

  var handler = binding.create((success) => {
    if (!success) throw new Error('Failed to create the audio handler.')
  })

  if (handler) {
    binding.open(handler, sampleRate, channels, format, (success) => {
      if (!success) throw new Error('Could not start the audio output with these properties.')
    })
  }

  write.end = end
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
  function write (buf, callback) {
    if (!callback) callback = noop
    if (!handler) return callback(new Error('Write occurred after the speaker closed.'))
    if (busy) return callback(new Error('Write occurred before the speaker flushed.'))

    //make sure audio buffer is converted to proper format
    if (isAudioBuffer(buf)) {
      if (buf._data) buf = buf._data
      else {
        var arr = new Float32Array(buf.length * channels)
        for (var c = 0, l = buf.length; c < channels; c++) {
          arr.set(buf.getChannelData(c), c*l)
        }
        buf = arr
      }

      buf = Buffer.from(convert(buf, {
          dtype: 'float32',
          interleaved: false,
          channels: channels
        }, {
          dtype: options.format,
          interleaved: true
        }).buffer
      )
    }

    next(buf, null, callback)

    function next (chunk, rest, callback) {
      if (handler) {
        busy = true

        var queue = !rest || !rest.length ? chunk : Buffer.concat([rest, chunk])
        if (!queue) queue = new Buffer(0) // meh

        var output = queue.length > chunkSize ? queue.slice(0, chunkSize) : queue
        var remaining = queue.length > chunkSize ? queue.slice(chunkSize, queue.length) : new Buffer(0)

        binding.write(handler, output, output.length, (written) => {
          // Play next chunk
          if (rest && rest.length) return next(null, remaining, callback)
          // Stream finished. Flush and callback
          var err = null
          if (autoFlush) {
            binding.flush(handler, (success) => {
              if (!success) err = new Error('Flushing speaker failed')
            })
          }
          busy = false
          callback(err)
        })
      } else {
        callback(new Error('Speaker closed while writing'))
      }
    }
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
    if (!handler) return

    binding.flush(handler, (success) => {
      if (!success) throw new Error('Failed to flush speaker.')
    })

    binding.close(handler, (success) => {
      if (!success) throw new Error('Could not close the speaker.')
      handler = null
    })
  }
}

Speaker.getFormat = function (format) {
  switch (format) {
    case 'uint8':
    case 'uint8_clamped':
      return binding.MPG123_ENC_UNSIGNED_8;
    case 'uint16':
      return binding.MPG123_ENC_UNSIGNED_16;
    case 'uint24':
      return binding.MPG123_ENC_UNSIGNED_24;
    case 'uint32':
      return binding.MPG123_ENC_UNSIGNED_32;
    case 'int8':
      return binding.MPG123_ENC_SIGNED_8;
    case 'int16':
      return binding.MPG123_ENC_SIGNED_16;
    case 'int24':
      return binding.MPG123_ENC_SIGNED_24;
    case 'int32':
      return binding.MPG123_ENC_SIGNED_32;
    case 'array':
    case 'float32':
      return binding.MPG123_ENC_FLOAT_32;
    case 'float64':
      return binding.MPG123_ENC_FLOAT_64;
  }
}

