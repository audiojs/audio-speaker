# audio-speaker [![unstable](https://img.shields.io/badge/stability-unstable-green.svg)](http://github.com/badges/stability-badges) [![Build Status](https://img.shields.io/travis/audiojs/audio-speaker.svg)](https://travis-ci.org/audiojs/audio-speaker) [![Greenkeeper badge](https://badges.greenkeeper.io/audiojs/audio-speaker.svg)](https://greenkeeper.io/)

Write audio data to speaker in node or browser.

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

**Note:** For browser-only usage `--no-optional` flag skips downloading node.js backend.

## Usage

### `write = createSpeaker(options?)`

`options`:

 - `channels` (default `1`)
 - `sampleRate` (default `44100`)

Returns a speaker funciton you can use to write `AudioBuffer`s.

```js
var speaker = createSpeaker()

// Or with options
var speaker = createSpeaker({ channels: 2, sampleRate: 48000 })
```

### `write(buf, done?)`

Writes an `AudioBuffer` to the speaker and plays it back.

```js
var sine = oscillator({ wave: 'sine', duration: 1 })

write(sine(), err => {
  // Played
})
```

## License

© 2020 AudioJS. MIT License
