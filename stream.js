'use strict'

var inherits = require('util').inherits
var Through = require('audio-through')
var Speaker = require('./index')

module.exports = StreamSpeaker

inherits(StreamSpeaker, Through)

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

  opts = opts || {};
  Through.call(this, opts)

  this.speaker = Speaker(opts)
  this.on('end', () => this.speaker.end())
}
StreamSpeaker.prototype.process = function (chunk, callback) {
  this.speaker(chunk, (err, written) => {
    return err ? callback(err) : callback()
  });
}
