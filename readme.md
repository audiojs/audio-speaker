
# audio-speaker

> Write audio to the speaker in node/browser

[![Build Status](https://api.travis-ci.org/audiojs/audio-speaker.svg?branch=release-2.0)](https://travis-ci.org/audiojs/audio-speaker) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

Write [AudioBuffers](https://github.com/audiojs/audio-buffer) to the speaker in node or browser.

```js
var generator = require('audio-generator')
var speaker = require('audio-speaker')

// Create a sine wave:
var sine = generator(time => {
  return Math.sin(PI * 2 * time * 440)
})

(function loop () {
  speaker(sine(), loop)
})()
```

(See more examples in [`test`](test.js))

## Packages

If you need some other way to write to speaker, here is a list of implementations:

 - [`audio-speaker`](https://github.com/audiojs/audio-speaker) for a plain function (this module)
 - [`audio-speaker-stream`](https://github.com/audiojs/pull-audio-speaker) for use with [Node streams](https://nodejs.org/api/stream.html)
 - [`pull-audio-speaker`](https://github.com/audiojs/pull-audio-speaker) for a [pull-stream](https://github.com/pull-stream/pull-stream) sink function

## Install

```sh
npm i audio-speaker
```

**Note:** When only on browser you can use `--no-optional` to skip downloading the Node.js backend.

## Usage

### `createSpeaker(options?)`

Accepts the options:

 - `autoFlush` (default `true`)
 - `channels` (default `1`)
 - `sampleRate` (default `44100`)
 - `bitDepth` (default `16`)
 - `signed` (default `true`)
 - `float` (default `false`)
 - `endianess` (default `'LE'`)

Returns a speaker funciton you can use to write `AudioBuffer`s. 

```js
var speaker = createSpeaker()
// Or with options:
var speaker = createSpeaker({ channels: 2, bitDepth: 8 })
```

### `speaker(buf, done?)`

Writes an `AudioBuffer` to the speaker and plays it back.

```js
var sine = oscillator({ wave: 'sine', duration: 1 })

write(sine(), err => {
  // Finished
})
```

## Also see

 - [`web-audio-stream`](https://github.com/audiojs/web-audio-stream): Stream data to web-audio.<br/>
 - [`audio-through`](http://npmjs.org/package/audio-through): Universal stream for processing audio.<br/>
 - [`audio-feeder`](https://github.com/brion/audio-feeder): Cross-browser speaker for PCM data.<br/>
 - [`mpg123`](https://github.com/audiojs/mpg123): Fork of mpg123 made to suit audio-speaker.<br/>

