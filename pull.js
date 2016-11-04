'use strict'

var drain = require('pull-stream/sinks/drain')
var asyncMap = require('pull-stream/throughs/async-map')
var pull = require('pull-stream/pull')
var Speaker = require('./index')

module.exports = PullSpeaker

/**
 * The PullSpeaker function initializes a speaker
 * and returns a sink for data to be pulled to, which
 * is then written to the speaker.
 *
 * @param {Object} opts options for the speaker
 * @return {Drain} drain pull-stream sink for the data to be pulled to
 * @module PullSpeaker
 * @api public
 */
function PullSpeaker (opts) {
  var speaker = Speaker(opts)
  var d = drain()

  var sink = pull(asyncMap(function (buf, done) {
    done(true)
    speaker(buf, null, (err, written) => {
      if (err) {
        speaker.end(false)
        done(err)
      } else {
        speaker.end(true)
      }
    })
  }), d)

  sink.abort = d.abort
  return sink
}
