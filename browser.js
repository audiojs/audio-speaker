/** @module  audio-speaker/browser */
'use strict'

var objectAssign = require('object-assign')
var createContext = require('audio-context')
var createWriter = require('web-audio-write')

module.exports = Speaker

function Speaker (opts) {
  var options = {}

  options = objectAssign({
    channels: 1,
    sampleRate: 44100
  }, opts)

  var ctx = options.context || createContext(options)
  var write = createWriter(ctx.destination, options)

  return write
}
