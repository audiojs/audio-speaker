'use strict'

var drain = require('pull-stream/sinks/drain')
var asyncMap = require('pull-stream/throughs/async-map')
var pull = require('pull-stream/pull')
var Speaker = require('./index')

module.exports = PullSpeaker

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
