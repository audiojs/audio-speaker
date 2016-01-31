var Speaker = require('./');
var Generator = require('audio-generator');
var Readable = require('stream').Readable;
var util = require('audio-buffer-utils');
var pcm = require('pcm-util');
var Through = require('audio-through');
Through.log = true;
var test = require('tst')//.only();


test('Feed audio-through', function () {
	Generator({
		generate: function (time) {
			return [
				Math.random()
			]
		},
		duration: 0.4
	}).pipe(Speaker());
});

test('Feed raw pcm', function () {
	var count = 0;
	Readable({
		read: function (size) {
			var abuf = util.create(2, 1024, 44100);

			//EGG: swap ch & i and hear wonderful sfx
			util.fill(abuf, function (v, ch, i) {
				return Math.sin(Math.PI * 2 * ((count + i)/44100) * (438 + ch*2) ) / 5;
			});

			count += 1024;

			if (count > 5e4 ) return this.push(null);

			this.push(pcm.toBuffer(abuf));
		}
	}).pipe(Speaker({
		channels: 2
	}));
});

test('Feed custom pcm', function () {
	var count = 0;
	Readable({
		read: function (size) {
			var abuf = util.create(2, 1024, 44100);

			util.fill(abuf, function (v, ch, i) {
				return Math.sin(Math.PI * 2 * ((count + i)/44100) * (338 + ch*2) );
			});

			count += 1024;

			if (count > 5e4 ) return this.push(null);

			this.push(pcm.toBuffer(abuf, {
				float: true
			}));
		}
	}).pipe(Speaker({
		channels: 2,

		//EGG: comment this and hear wonderful sfx
		float: true
	}));
});

test.skip('Feed random buffer size');