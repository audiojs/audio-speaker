'use strict';

var Speaker = require('../stream');
var Generator = require('audio-generator/stream');
var Generate = require('audio-generator/index');
var Readable = require('stream').Readable;
var util = require('audio-buffer-utils');
var pcm = require('pcm-util');
var Through = require('audio-through');
Through.log = true;
var Volume = require('pcm-volume');
var test = require('tape')
var SpeakerWriter = require('../index');
var pull = require('pull-stream');
var PullSpeaker = require('../pull');
var pullGenerator = require('audio-generator/pull');



test('Pure function', function (t) {
	let generate = Generate(t => {
		return Math.sin(t * Math.PI * 2 * 440);
	}, 1);

	let write = SpeakerWriter();

	(function loop (err) {
		if (err) return write(null);
		write(generate(), loop)
	})();

	setTimeout(() => {
		write(null);
		t.end();
	}, 200);
});

// test('Pull stream', function (t) {
// 	let out = PullSpeaker();

// 	pull(
// 		pullGenerator(time => 2 * time * 440 - 1, {frequency: 440}),
// 		out
// 	);

// 	setTimeout(() => {
// 		out.abort();
// 		t.end();
// 	}, 500);
// });

// test('Cleanness of wave', function (t) {
// 	Through(function (buffer) {
// 		var self = this;
// 		util.fill(buffer, function (sample, idx, channel) {
// 			return Math.sin(Math.PI * 2 * (self.count + idx) * 440 / 44100);
// 		});

// 		if (this.time > 1) return this.end();

// 		return buffer;
// 	})
// 	.pipe(Speaker());
// 	// .pipe(WAASteam(context.destination));
// 	t.end();
// });

// test('Feed audio-through', function (t) {
// 	Generator({
// 		generate: function (time) {
// 			return [
// 				Math.sin(Math.PI * 2 * time * 538 ) / 5,
// 				Math.sin(Math.PI * 2 * time * 542 ) / 5
// 				// Math.random()
// 			]
// 		},
// 		duration: .4
// 	}).pipe(Speaker());

// 	t.end()
// });

// test('Feed raw pcm', function (t) {
// 	var count = 0;
// 	Readable({
// 		read: function (size) {
// 			var abuf = util.create(2, 1024, 44100);

// 			//EGG: swap ch & i and hear wonderful sfx
// 			util.fill(abuf, function (v, i, ch) {
// 				v = Math.sin(Math.PI * 2 * ((count + i)/44100) * (738 + ch*2) ) / 5;
// 				return v;
// 			});

// 			count += 1024;

// 			if (count > 1e4 ) return this.push(null);

// 			let buf = pcm.toBuffer(abuf);

// 			this.push(buf);
// 		}
// 	})
// 	.pipe(Speaker({
// 		channels: 2
// 	}));

// 	t.end()
// });

// //FIXME: use transform stream here to send floats data to speaker
// test.skip('Feed custom pcm', function (t) {
// 	var count = 0;
// 	Readable({
// 		// objectMode: 1,
// 		read: function (size) {
// 			var abuf = util.create(2, 1024, 44100);

// 			util.fill(abuf, function (v, i, ch) {
// 				return Math.sin(Math.PI * 2 * ((count + i)/44100) * (938 + ch*2) );
// 			});

// 			count += 1024;

// 			if (count > 1e4 ) return this.push(null);

// 			let buf = pcm.toBuffer(abuf, {
// 				float: true
// 			});

// 			this.push(buf);
// 		}
// 	}).pipe(Speaker({
// 		channels: 2,

// 		//EGG: comment this and hear wonderful sfx
// 		float: true
// 	}));

// 	t.end()
// });

// test.skip('Feed random buffer size');

// test('Volume case', function (t) {
// 	Generator({
// 		generate: function (time) {
// 			return [
// 				Math.sin(Math.PI * 2 * time * 1038 ) / 5,
// 				Math.sin(Math.PI * 2 * time * 1042 ) / 5
// 			];
// 		},
// 		duration: 1
// 	})
// 	.pipe(Volume(5))
// 	.pipe(Speaker());

// 	t.end()
// });
