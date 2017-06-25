# audio-speaker [![unstable](https://img.shields.io/badge/stability-unstable-green.svg)](http://github.com/badges/stability-badges) [![Build Status](https://img.shields.io/travis/audiojs/audio-speaker.svg)](https://travis-ci.org/audiojs/audio-speaker) [![Greenkeeper badge](https://badges.greenkeeper.io/audiojs/audio-speaker.svg)](https://greenkeeper.io/)

Write [AudioBuffer](https://github.com/audiojs/audio-buffer) to the speaker in node or browser.

```js
var generator = require('audio-generator')
var speaker = require('audio-speaker')

// Create a 440Hz sine wave
var sine = generator(time => {
  return Math.sin(PI * 2 * time * 440)
})

(function loop () {
  speaker(sine(), loop)
})()
```

See more examples in [`test`](test.js).


## Install

```sh
npm i audio-speaker
```

**Note:** When only on browser you can use `--no-optional` to skip downloading the Node.js backend.

## Usage

### `let speaker = createSpeaker(options?)`

Accepts the options:

 - `autoFlush` (default `true`)
 - `channels` (default `1`)
 - `sampleRate` (default `44100`)

Returns a speaker funciton you can use to write `AudioBuffer`s.

```js
var speaker = createSpeaker()

// Or with options
var speaker = createSpeaker({ channels: 2, sampleRate: 48000 })
```

### `speaker(buf, done?)`

Writes an `AudioBuffer` to the speaker and plays it back.

```js
var sine = oscillator({ wave: 'sine', duration: 1 })

write(sine(), err => {
  // Played
})
```

## Related

 - [`audio-speaker-stream`](https://github.com/audiojs/audio-speaker-stream) for use with [Node streams](https://nodejs.org/api/stream.html).
 - [`pull-audio-speaker`](https://github.com/audiojs/pull-audio-speaker) for a [pull-stream](https://github.com/pull-stream/pull-stream) sink function.
 - [`audio-mpg123`](https://github.com/audiojs/audio-mpg123): Fork of mpg123 made to suit audio-speaker.

## License

© 2017 AudioJS. MIT License
