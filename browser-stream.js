'use strict'

var inherits = require('util').inherits
var WAAStream = require('web-audio-stream/writable')
var context = require('audio-context')

module.exports = BrowserStreamSpeaker

/**
 * The BrowserSpeaker function initalizes and returns
 * a {Module} webaudiostream to write to from a stream.
 *
 * @param {Object} opts options for the speaker
 * @return {Module} webaudiostream for writing data to
 * @module BrowserSpeaker
 * @api public
 */
function BrowserStreamSpeaker (opts) {
  if (!(this instanceof BrowserStreamSpeaker)) return new BrowserStreamSpeaker(opts)

  var ctx = opts && opts.context || context

  WAAStream.call(this, ctx.destination, opts)
}
