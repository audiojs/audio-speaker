/** @module  audio-speaker/browser */
'use strict'

var Writer = require('web-audio-stream/writer')
var context = require('audio-context')
function noop () {}

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
  opts = opts || {}

  // TODO: Is this acceptable? Better way to handle this?
  //       Leave it up to the user?
  if (!opts.samplesPerFrame) {
    opts.samplesPerFrame = 2048
  }

  var ctx = opts.context || context
  var dest = ctx.destination
  var node = ctx.createScriptProcessor()
  var _write = Writer(dest, opts)

  function write (data, cb) {
    var start = context.currentTime
    node.addEventListener('audioprocess', function ending (e, done) {
      if (e.playbackTime - start > data.duration) {
        node.removeEventListener('audioprocess', ending)
        cb(null, opts.samplesPerFrame)
      }
    })

    node.connect(dest)
    return _write(data, noop)
  }

  write.end = _write.end
  return write
}
