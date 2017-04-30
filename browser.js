/** @module  audio-speaker/browser */
'use strict'

var Writer = require('web-audio-stream/writer')
var context = require('audio-context')

module.exports = BrowserSpeaker

/**
 * The BrowserSpeaker function initalizes and returns
 * a {Module} webaudiostream to write to.
 *
 * @param {Object} opts options for the speaker
 * @return {Module} webaudiostream for writing data to
 * @module BrowserSpeaker
 * @api public
 */
function BrowserSpeaker (opts) {
  var ctx = opts && opts.context || context

  return Writer(ctx.destination, opts)
}
