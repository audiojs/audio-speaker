# audio-speaker [![Build Status](https://travis-ci.org/audiojs/audio-speaker.svg?branch=master)](https://travis-ci.org/audiojs/audio-speaker) [![stable](https://img.shields.io/badge/stability-stable-brightgreen.svg)](http://github.com/badges/stability-badges) [![Greenkeeper badge](https://badges.greenkeeper.io/audiojs/audio-speaker.svg)](https://greenkeeper.io/)

Output audio stream to speaker in node or browser.

[![npm install audio-speaker](https://nodei.co/npm/audio-speaker.png?mini=true)](https://npmjs.org/package/audio-speaker/)


### Use as a stream

```js
var Speaker = require('audio-speaker/stream');
var Generator = require('audio-generator/stream');

Generator(function (time) {
	//panned unisson effect
	var τ = Math.PI * 2;
	return [Math.sin(τ * time * 441), Math.sin(τ * time * 439)];
})
.pipe(Speaker({
	//PCM input format defaults, optional.
	//channels: 2,
	//sampleRate: 44100,
	//byteOrder: 'LE',
	//bitDepth: 16,
	//signed: true,
	//float: false,
	//interleaved: true,
}));
```

### Use as a pull-stream

```js
const pull = require('pull-stream/pull');
const speaker = require('audio-speaker/pull');
const osc = require('audio-oscillator/pull');

pull(osc({frequency: 440}), speaker());
```

### Use directly

Speaker is [async-sink](https://github.com/audiojs/contributing/wiki/Streams-convention) with `fn(data, cb)` notation.

```js
const createSpeaker = require('audio-speaker');
const createGenerator = require('audio-generator');

let output = createSpeaker();
let generate = createGenerator(t => Math.sin(t * Math.PI * 2 * 440));

(function loop (err, buf) {
	let buffer = generate();
	output(buffer, loop);
})();
```


## Alternatives

- [node-web-audio-api](https://github.com/ircam-ismm/node-web-audio-api) — Full W3C Web Audio in Node via Rust/cpal
- [@picovoice/pvspeaker-node](https://github.com/Picovoice/pvspeaker) — miniaudio PCM output
- [audify](https://github.com/almogh52/audify) — RtAudio N-API (stale)
- [naudiodon](https://github.com/Streampunk/naudiodon) — PortAudio streams (semi-active)
- [@kmamal/sdl](https://github.com/kmamal/node-sdl) — SDL2 full binding (active)
- [speaker](https://github.com/TooTallNate/node-speaker) — mpg123 output (stale, build issues)
- [play-sound](https://www.npmjs.com/package/play-sound) — Process-based file playback
