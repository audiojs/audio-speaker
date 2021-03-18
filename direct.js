/**
 * @module audio-speaker/direct
 *
 * Outputs chunk of data to audio output in node
 *
 */
'use strict';

const pcm = require('pcm-util');
const isAudioBuffer = require('is-audio-buffer');

const format = {
	float: false,
	interleaved: true,
	bitDepth: 16,
	signed: true
};


let NodeSpeaker, Sink;

try {
	NodeSpeaker = require('speaker');
}
catch (e) {
	console.warn('`speaker` package was not found. Using `audio-sink` instead.');
	Sink = require('audio-sink/direct');
}


module.exports = function (opts) {
	opts = Object.assign({}, format, opts);

	return opts.sink || !NodeSpeaker ? createSink(opts) : createSpeaker(opts);
}


/**
 * Speaker is just a format wrapper for node-speaker,
 * as node-speaker doesn’t support any input format in some platforms, like windows.
 * So we need to force the most safe format.
 *
 * @constructor
 */
function createSpeaker (opts) {
	//create node-speaker with default options - the most cross-platform case
	let speaker = new NodeSpeaker(opts);
	let ended = false;

	//FIXME: sometimes this lil fckr does not end stream hanging tests
	write.end = () => {
		ended = true;
		write(true);
	}

	return write;

	function write (chunk, cb) {
		if (chunk == null || chunk === true || ended) {
			ended = true;
			cb && cb(true);
			return;
		}

		let buf = isAudioBuffer(chunk) ? pcm.toBuffer(chunk, format) : chunk;
		speaker.write(buf, () => {
			if (ended) {
				speaker.close();
				speaker.end();
				return cb && cb(true);
			}
			cb && cb(null, chunk);
		});
	}
}

function createSink (opts) {
	let ended = false;

	let sampleRate = opts.sampleRate || 44100;
	let samplesPerFrame = opts.samplesPerFrame || 1024;

	let sink = Sink((data, cb) => {
		if (ended || data == null || data == true) return cb && cb(true);
		cb && setTimeout(cb, samplesPerFrame / sampleRate);
	});

	sink.end = () => {
		ended = true;
		sink(true);
	}

	return sink;
}


