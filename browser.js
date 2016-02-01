/**
 * @module audio-speaker
 */

var Through = require('../audio-through');
var context = require('audio-context');
var extend = require('xtend/mutable');
var inherits = require('inherits');
var pcm = require('pcm-util');
var util = require('../audio-buffer-utils');


/**
 * Sound rendering is based on looping audioBuffer.
 * That exposes the smallest possible latency avoiding GC, comparing to scriptProcessorNode.
 *
 * For realtime play it is necessary to make sure that
 * output buffer refills in equal intervals, regardless of the input data availability.
 * In that, there is an audioBuffer for scheduled data to play
 * and a data buffer with preloaded data.
 *
 * Output also controls how other nodes are rendered, via back-pressure.
 * In that, it is possible to render sound in background faster than realtime.
 *
 * @constructor
 */
function Speaker (options) {
	if (!(this instanceof Speaker)) return new Speaker(options);

	Through.call(this, options);

	var self = this;

	if (self.mode === Speaker.SCRIPT_MODE) {
		self.initScriptMode();
	}
	else {
		self.initBufferMode();
	}


	//ensure to send a couple of silence-buffers if connected source ends
	self.on('pipe', function (src) {
		src.once('end', function () {
			//FIXME: with no reason sometimes it does not send the data
			//FIXME: resolve this issue, it should not be like that, write should work
			var buf = util.create(self.inputFormat.channels, self.inputFormat.samplesPerFrame);

			self.write(buf);
			self.once('tick', function () {
				if (self.state !== 'ended') self.write(buf);
			});
		});
	});

	return self;
}

inherits(Speaker, Through);


/**
 * Whether to use scriptProcessorNode or other mode of rendering
 */
Speaker.prototype.SCRIPT_MODE = 1;
Speaker.prototype.BUFFER_MODE = 0;
Speaker.prototype.mode = Speaker.prototype.BUFFER_MODE;


/**
 * Init scriptProcessor-based rendering.
 * Each audioprocess event triggers tick, which releases pipe
 *
 * FIXME: this is really unstable scheduler. setTimeout-based one is a way better
 */
Speaker.prototype.initScriptMode = function () {
	var self = this;

	//buffer source node
	self.bufferNode = self.context.createBufferSource();
	self.bufferNode.loop = true;
	self.bufferNode.buffer = util.create(self.inputFormat.channels, self.inputFormat.samplesPerFrame);
	self.buffer = self.bufferNode.buffer;

	self.scriptNode = self.context.createScriptProcessor(self.inputFormat.samplesPerFrame);
	self.scriptNode.addEventListener('audioprocess', function (e) {
		util.copy(e.inputBuffer, e.outputBuffer);

		//FIXME: if GC (I guess) is clicked, this guy may just stop generating that evt
		//possibly there should be a promise-like thing, resetting scriptProcessor, or something... Like, N reserve scriptProcessors
		self.emit('tick');
	});


	//once source self is finished - disconnect modules
	self.once('end', function () {
		self.bufferNode.stop();
		self.scriptNode.disconnect();
	});

	//start should be done after the connection, or there is a chance it won’t
	self.bufferNode.connect(self.scriptNode);
	self.scriptNode.connect(self.context.destination);
	self.bufferNode.start();

	return self;
};


/**
 * Buffer-based rendering.
 * The schedule is triggered by setTimeout.
 */
Speaker.prototype.initBufferMode = function () {
	var self = this;

	//how many times output buffer contains input one
	var FOLD = 2;

	//buffer source node
	self.bufferNode = self.context.createBufferSource();
	self.bufferNode.loop = true;
	self.bufferNode.buffer = util.create(self.inputFormat.channels, self.inputFormat.samplesPerFrame * FOLD);
	self.buffer = self.bufferNode.buffer;

	//get channels data
	var channelData = util.data(self.buffer);

	//save time of start
	var lastMoment = self.context.currentTime;
	var initMoment = lastMoment;

	//offset within the buffer
	self.offset = undefined;

	//audio buffer realtime ticked cycle
	//FIXME: plan by context time instead of using the interval. Or ok? IDK.
	setInterval(tick);

	self.bufferNode.connect(self.context.destination);
	self.bufferNode.start();

	var lastOffset = 0;

	//tick function - if the half-buffer is passed - emit the tick event, which will fill the buffer
	function tick () {
		var playedTime = self.context.currentTime - initMoment;
		var playedCount = Math.round(playedTime * self.context.sampleRate);
		var offsetCount = playedCount % self.buffer.length;

		//displacement within the buffer
		var offset = Math.floor(offsetCount / self.inputFormat.samplesPerFrame);

		//if offset has changed - notify processor to provide a new piece of data
		if (offset != lastOffset) {
			lastOffset = offset;
			self.offset = ((offset + 1) % FOLD) * self.inputFormat.samplesPerFrame;
			self.emit('tick');
		}
	}

	//once source self is finished - disconnect modules
	self.once('end', function () {
		self.bufferNode.stop();
		self.bufferNode.disconnect();
	});

	return self;
}


/**
 * Prepare chunk to be sent to scriptNode or other node
 */
Speaker.prototype.process = function (buffer, done) {
	var self = this;

	//wait for played space is free
	self.once('tick', function () {
		//bring stream data to audio-context
		util.copy(buffer, self.buffer, self.offset || 0);

		//release cb
		done();
	});
};



/**
 * Read data chunk from the buffer.
 * Schedule data chunk to audio destination.
 */
/*Speaker.prototype._write = function (chunk, encoding, callback) {
	var self = this;

	var methName = self.readMethodName;

	var sampleSize = self.bitDepth / 8;
	var frameLength = Math.floor(chunk.length / sampleSize / self.channels);

	//if data buffer is full - wait till the next tick
	if (self.data[0].length + frameLength >= self.dataLength) {
		self.once('tick', function () {
			self._write(chunk, encoding, callback);
		});
		return;
	}

	//save the data
	var offset, value;
	for (var i = 0; i < frameLength; i++) {
		for (var channel = 0; channel < self.channels; channel++) {
			offset = self.interleaved ? channel + i * self.channels : channel * self.samplesPerFrame + i;
			value = pcm.convertSample(chunk[methName]( offset * sampleSize ), self, {float: true});
			self.data[channel].push(value);
		}
	}

	callback();
}*/


/** Schedule set of chunks */
// Speaker.prototype._writev = function (chunks, callback) {
// 	var self = this;
// 	var chunk;
// 	chunks.forEach(function (writeReq) {
// 		var chunk = writeReq.chunk;
// 		var chunkLen = Math.floor(chunk.length / 4);
// 		for (var i = 0; i < chunkLen; i++) {
// 			self.data.push(chunk.readFloatLE(i*4));
// 		}
// 	});
// 	callback();
// }


/** Default audio context */
Speaker.prototype.context = context;



/**
 * Samples per channel for audio buffer.
 * Small sizes are dangerous as time between processor ticks
 * can be more time than the played buffer, especially due to GC.
 * If GC is noticeable - increase that.
 */
// Speaker.prototype.bufferLength = 256 * 16;


/**
 * Data buffer keeps all the input async data to provide realtime audiobuffer data.
 * Should be more than audio buffer size to always be in from of realtime sound.
 */
// Speaker.prototype.dataLength = Speaker.prototype.bufferLength * 2;



module.exports = Speaker;