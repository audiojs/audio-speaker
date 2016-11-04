'use strict'

var inherits = require('util').inherits
var objectAssign = require('object-assign')
var audioThrough = require('audio-through')
var Speaker = require('./index')

module.exports = StreamSpeaker

/**
 * The StreamSpeaker function initializes a speaker
 * and inherits {Module} AudioThrough for pipable data
 * functionality.
 *
 * @param {Object} opts options for the speaker
 * @return void
 * @module StreamSpeaker
 * @api public
 */
function StreamSpeaker (opts) {
  if (!(this instanceof StreamSpeaker)) return new StreamSpeaker(opts)

  var options = {}
  objectAssign(options, opts)

  audioThrough.call(this, options)

  this.speaker = Speaker(options)

  StreamSpeaker.prototype._write = function (chunk, encoding, callback) {
    this.speaker(chunk, null, (err, written) => {
      return err ? callback(err) : callback()
    })
  }

  StreamSpeaker.prototype.end = this.speaker.end
}
inherits(StreamSpeaker, audioThrough)
