// var Speaker = require('./');
var Speaker = require('./');
var Generator = require('audio-generator');
var Readable = require('stream').Readable;
var util = require('audio-buffer-utils');
var pcm = require('pcm-util');
var Through = require('audio-through');
Through.log = true;
var Volume = require('pcm-volume');
var test = require('tst')//.only();
var WAASteam = require('web-audio-stream');
var context = require('audio-context');

require('insert-styles')(`
	@font-face {
		font-family: wavefont;
		src: url(./wavefont.otf) format("opentype");
	}
`);

test('Cleanness of wave', function () {
	Through(function (buffer) {
		var self = this;
		util.fill(buffer, function (sample, idx, channel) {
			return Math.sin(Math.PI * 2 * (self.count + idx) * 440 / 44100);
		});

		if (this.time > 1) return this.end();

		return buffer;
	})
	.pipe(Speaker());
	// .pipe(WAASteam(context.destination));
});

test('Feed audio-through', function () {
	Generator({
		generate: function (time) {
			return [
				Math.sin(Math.PI * 2 * time * 538 ) / 5,
				Math.sin(Math.PI * 2 * time * 542 ) / 5
				// Math.random()
			]
		},
		duration: .4
	}).pipe(Speaker());
});

test('Feed raw pcm', function () {
	var count = 0;
	Readable({
		read: function (size) {
			var abuf = util.create(2, 1024, 44100);

			//EGG: swap ch & i and hear wonderful sfx
			util.fill(abuf, function (v, i, ch) {
				v = Math.sin(Math.PI * 2 * ((count + i)/44100) * (738 + ch*2) ) / 5;
				return v;
			});

			count += 1024;

			if (count > 1e4 ) return this.push(null);

			let buf = pcm.toBuffer(abuf);

			this.push(buf);
		}
	})
	.pipe(Speaker({
		channels: 2
	}));
});

//FIXME: use transform stream here to send floats data to speaker
test.skip('Feed custom pcm', function () {
	var count = 0;
	Readable({
		// objectMode: 1,
		read: function (size) {
			var abuf = util.create(2, 1024, 44100);

			util.fill(abuf, function (v, i, ch) {
				return Math.sin(Math.PI * 2 * ((count + i)/44100) * (938 + ch*2) );
			});

			count += 1024;

			if (count > 1e4 ) return this.push(null);

			let buf = pcm.toBuffer(abuf, {
				float: true
			});

			this.push(buf);
		}
	}).pipe(Speaker({
		channels: 2,

		//EGG: comment this and hear wonderful sfx
		float: true
	}));
});

test.skip('Feed random buffer size');

test('Volume case', function () {
	Generator({
		generate: function (time) {
			return [
				Math.sin(Math.PI * 2 * time * 1038 ) / 5,
				Math.sin(Math.PI * 2 * time * 1042 ) / 5
			];
		},
		duration: 1
	})
	.pipe(Volume(5))
	.pipe(Speaker());
});




//little debigger
if (typeof document !== 'undefined') {
	var el = document.body.appendChild(document.createElement('div'));
	el.style.cssText = `
	font-family: wavefont;
	max-width: 100vw;
	word-break: break-all;
	white-space: pre-wrap;
	font-size: 32px;
	`;

	function draw (arr) {
		let str = '';

		for (let i = 0; i < arr.length; i++) {
			str += String.fromCharCode(0x200 + Math.floor(arr[i] * 128 * 5));
		}

		el.innerHTML += '\n' + str;
	}
}
