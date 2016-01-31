/**
 * @module audio-speaker
 */

var Through = require('../audio-through');
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

	//audioBufferSourceNode
	self.bufferNode = self.context.createBufferSource();
	self.bufferNode.loop = true;
	self.bufferNode.buffer = util.create(self.inputFormat.channels, self.inputFormat.samplesPerFrame);
	self.buffer = self.bufferNode.buffer;


	//scriptProcessor mode of rendering
	self.scriptNode = self.context.createScriptProcessor(self.inputFormat.samplesPerFrame);
	self.scriptNode.addEventListener('audioprocess', function (e) {
		//FIXME: if GC (I guess) is clicked, this guy may just stop generating that evt
		self.emit('tick', e.outputBuffer);
	});

	//add evt
	self.once('end', function () {
		self.bufferNode.stop();
		self.scriptNode.disconnect();
	});

	//connect nodes to destination
	self.bufferNode.connect(self.scriptNode);
	self.scriptNode.connect(self.context.destination);

	//start should be done after the connection, or there is a chance it won’t
	setTimeout(function () {
		self.bufferNode.start()
	});


	//ensure to send a couple of silence-buffers if connected source ends
	self.on('pipe', function (src) {
		src.once('end', function () {
			self.write(util.create(self.inputFormat.channels, self.inputFormat.samplesPerFrame));
			self.write(util.create(self.inputFormat.channels, self.inputFormat.samplesPerFrame));
		});
	});

	return self;



	//ready data to play, separated by channels
	self.data = [];
	for (var i = 0; i < self.inputFormat.channels; i++) {
		self.data[i] = [];
	}

	self.lastTime = self.context.currentTime;
	self.initTime = self.lastTime;

	//offset points to the last loaded data in the audio buffer
	self.offset = 0;

	//count represents the absolute data loaded in the audio buffer
	self.count = 0;

	//audio buffer realtime ticked cycle
	self.tick();
	self.tickInterval = setInterval(self.tick.bind(self));

	return self;
}

inherits(Speaker, Through);


/**
 * Whether to use scriptProcessor or other mode
 */
Speaker.prototype.mode = 'scriptNode';


/**
 * Prepare chunk to be sent to scriptNode or other node
 */
Speaker.prototype.process = function (buffer, done) {
	var self = this;

	self.once('tick', function (output) {
		util.copy(buffer, output);
		done();
	});
};


/**
 * Ticking function.
 * Fills the audio buffer with data from the data buffer.
 */
Speaker.prototype.tick = function () {
	var self = this;

	var now = self.context.currentTime - self.initTime;
	var timeSpent = now - self.lastTime;
	var playedCount = Math.round(now * self.context.sampleRate);

	//min chunk size is the time passed
	var chunkLength = Math.round(timeSpent * self.context.sampleRate);

	//max chunk size is avail space up the next audio buffer cycle
	if (self.count < playedCount) {
		chunkLength = Math.max(chunkLength, (playedCount - self.count) + self.bufferLength );
	}

	//fill chunk with available data and the rest - with zeros
	var channelData = util.data(self.buffer);
	var value;

	for (var i = 0; i < chunkLength; i++) {
		for (var channel = 0; channel < self.channels; channel++) {
			channelData = self.data[channel];
			channelData = self.channelData[channel];

			if (channelData.length) {
				value = channelData.shift();
			}
			else {
				value = 0;
			}

			channelData[self.offset] = value;
		}

		self.offset++;
		self.count++;

		// reset offset
		if (self.offset >= channelData.length) {
			self.offset = 0;
		}
	}

	self.emit('tick');

	self.lastTime = now;

	/*
	//debug
	var count = self.count;
	var offset = self.offset;

	// var data = Array.from(self.data);
	var data = [new Float32Array(self.buffer.length), new Float32Array(self.buffer.length)];
	self.buffer.copyFromChannel(data[0], 0);
	self.buffer.copyFromChannel(data[1], 1);

	debug.draw(data, function (canvas) {
		var ctx = canvas.getContext('2d');
		var width = canvas.width;
		var height = canvas.height;

		var step = (width / data.length);

		//paint current time
		var currentTimeOffset = Math.floor(playedCount % data.length);
		ctx.fillStyle = 'rgba(0,0,255,.2)';
		ctx.fillRect(currentTimeOffset * step, 0, 1, height);
		ctx.fillRect(currentTimeOffset * step, 0, 1, height);

		//paint filled chunk
		ctx.fillStyle = 'rgba(255,0,0,.2)';
		ctx.fillRect(offset * step - 2, 0, 2, height);
		ctx.fillRect(offset * step - 2, 0, 2, height);

		//draw stats
		ctx.fillStyle = 'rgba(255,255,255,.8)';
		ctx.fillRect(0, height - 20, height - 5, width - 10);
		ctx.fillStyle = 'black';
		ctx.fillText(`${ playedCount }→${ playedCount + data.length } ${ count } ${ value===0 }`, 5, height - 5, width - 10);
	});
	*/
}


/**
 * Read data chunk from the buffer.
 * Schedule data chunk to audio destination.
 */
// Speaker.prototype._write = function (chunk, encoding, callback) {
// 	var self = this;

// 	var methName = self.readMethodName;

// 	var sampleSize = self.bitDepth / 8;
// 	var frameLength = Math.floor(chunk.length / sampleSize / self.channels);

// 	//if data buffer is full - wait till the next tick
// 	if (self.data[0].length + frameLength >= self.dataLength) {
// 		self.once('tick', function () {
// 			self._write(chunk, encoding, callback);
// 		});
// 		return;
// 	}

// 	//save the data
// 	var offset, value;
// 	for (var i = 0; i < frameLength; i++) {
// 		for (var channel = 0; channel < self.channels; channel++) {
// 			offset = self.interleaved ? channel + i * self.channels : channel * self.samplesPerFrame + i;
// 			value = pcm.convertSample(chunk[methName]( offset * sampleSize ), self, {float: true});
// 			self.data[channel].push(value);
// 		}
// 	}

// 	callback();
// }


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