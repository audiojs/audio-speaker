/**
 * Paint buffer state for each tick.
 *
 * @module  audio-speaker/debug
 */

var raf = require('component-raf');


//just draw a new waveform canvas
var canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 150;


//draw buffer, highlight the subset
var renderCount = 0;
function draw (data, cb) {
	if (renderCount++ > 300) return;

	raf(function () {
		canvas = canvas.cloneNode();
		document.body.appendChild(canvas);
		var ctx = canvas.getContext('2d');
		var width = canvas.width;
		var height = canvas.height;
		var channelData;

		ctx.clearRect(0,0,width,height);

		//draw each channel
		for (var channel = 0; channel < data.length; channel++) {
			channelData = data[channel];

			ctx.fillStyle = 'black';
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 1;
			ctx.lineCap = 'round';

			var step = channelData.length / width;
			var channelHeight = height / data.length;
			var amp = channelHeight / 2;
			var middle = amp + channelHeight * channel;

			ctx.beginPath();
			ctx.moveTo(0, middle);

			for(var i=0; i < width; i++){
				ctx.lineTo(i, channelData[Math.round(step * i)] * amp + middle);
				// ctx.fillRect(i, data[Math.round(step * i)] * amp + amp, 1, 1);
			}

			ctx.lineTo(width, middle);

			ctx.stroke();
			ctx.closePath();
		}

		cb(canvas);
	});
}

/** Throttled log */
var pause = false;
function log () {
	if (!pause) {
		pause = true;
		console.log.apply(console, arguments);
		setTimeout(function () {
			pause = false;
		}, 50);
	}
}


module.exports = {
	draw: draw,
	log: log
};