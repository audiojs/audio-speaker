/**
 * @module audio-speaker
 */

var Through = require('audio-through');
var context = require('audio-context');
var extend = require('xtend/mutable');
var inherits = require('inherits');
var pcm = require('pcm-util');
var util = require('audio-buffer-utils');


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

	//just prerender silence buffer
	self._silence = util.create(self.inputFormat.channels, self.inputFormat.samplesPerFrame);

	//ensure to send a couple of silence-buffers if connected source ends
	self.on('pipe', function (src) {
		src.once('end', function () {
			//FIXME: with no reason sometimes it does not send the data
			//FIXME: resolve this issue, it should not be like that, write should work
			self.write(self._silence);
			self.once('tick', function () {
				if (self.state !== 'ended') self.write(self._silence);
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
		util.copy(self._readyData, self.buffer);
		var release = self._release;
		self._readyData = null;
		self._release = null;
		release();
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
	setInterval(tick, Math.floor(self.buffer.duration * 1000 / 3));

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

			//if there is a data - release it
			if (self._readyData) {
				util.copy(self._readyData, self.buffer, self.offset);
				var release = self._release;
				self._readyData = null;
				self._release = null;
				release();
			}
			//if there is a timeout but no data - fill with silence
			else {
				util.copy(self._silence, self.buffer, self.offset);
			}
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
	self._readyData = buffer;
	self._release = done;
};


/** Default audio context */
Speaker.prototype.context = context;

module.exports = Speaker;