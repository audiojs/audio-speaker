Output PCM data to speaker, both for node and browser.
For node it wraps [node-speaker](https://github.com/TooTallNate/node-speaker), extending available input formats and ensuring output format.
For browser it uses web-audio-api cycled `audioBuffer` to provide minimal possible delay and to avoid GC glitches, comparing to `scriptProcessorNode`.

[`npm install audio-speaker`](https://npmjs.org/package/audio-speaker)

```js
var Speaker = require('audio-speaker');
var Generator = require('audio-generator');

Generator(function (time) {
	//panned unisson effect
	var τ = Math.PI * 2;
	return [Math.sin(τ * time * 441), Math.sin(τ * time * 439)];
})
.pipe(Speaker({
	//PCM input format settings
	channels: 2,
	sampleRate: 44100,
	byteOrder: 'LE',
	bitDepth: 16,
	signed: true,
	float: false,
	interleaved: true
}));
```