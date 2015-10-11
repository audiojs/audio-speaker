> Output PCM stream to speaker in node or browser.

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
	//PCM input format defaults, optional.
	channels: 2,
	sampleRate: 44100,
	byteOrder: 'LE',
	bitDepth: 16,
	signed: true,
	float: false,
	interleaved: true
}));
```