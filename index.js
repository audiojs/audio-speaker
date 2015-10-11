/**
 * Node entry.
 * Wraps node-speaker to ensure format.
 * @module audio-speaker
 */

var NodeSpeaker = require('speaker');
var inherits = require('inherits');
var extend = require('xtend/mutable');
var os = require('os');
var PcmFormat = require('audio-pcm-format');


/**
 * Speaker is just a format wrapper for node-speaker,
 * as node-speaker doesn’t support any input format in some platforms, like windows.
 * So we need to force the most safe format.
 *
 * @constructor
 */
function Speaker (opts) {
	if (!(this instanceof Speaker)) {
		return new Speaker(opts);
	}

	extend(this, opts);

	//default output format for node-speaker
	var outputFormat = {
		channels: this.channels,
		interleaved: true,
		bitDepth: 16,
		signed: true
	};

	//init proper transformer
	PcmFormat.call(this, this, outputFormat);

	//create node-speaker with default options - the most cross-platform case
	this.speaker = new NodeSpeaker(outputFormat);

	this.pipe(this.speaker);
}

inherits(Speaker, PcmFormat);


/** Input PCM options */
Speaker.prototype.channels = 2;
Speaker.prototype.sampleRate = 44100;
Speaker.prototype.samplesPerFrame = undefined;
Speaker.prototype.bitDepth = 16;
Speaker.prototype.signed = true;
Speaker.prototype.float = false;
Speaker.prototype.byteOrder = 'function' == os.endianness ? os.endianness() : 'LE';
Speaker.prototype.interleaved = true;


module.exports = Speaker;