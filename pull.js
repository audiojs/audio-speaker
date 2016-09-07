/**
 * @module audio-speaker/pull
 *
 */
'use strict';

const Writer = require('./direct');
const drain = require('pull-stream/sinks/drain');
const asyncMap = require('pull-stream/throughs/async-map');
const pull = require('pull-stream/pull');


module.exports = function PullSpeaker (opts) {
	let sinkFn = Writer(opts);
	let d = drain();

	let sink = pull(asyncMap(sinkFn), d);

	sink.abort = d.abort;

	return sink;
}
