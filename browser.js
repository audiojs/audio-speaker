/** @module  audio-speaker/browser */
'use strict'

var createWriter = require('web-audio-write')
var createContext = require('audio-context')

module.exports = function createSpeaker (opts) {
  opts = opts || {}

  var ctx = opts.context || createContext(opts)
  var write = createWriter(ctx.destination, opts)

  return write
}
