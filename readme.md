# audio-speaker

> Output audio natively in node.

[![Build Status](https://api.travis-ci.org/audiojs/audio-speaker.svg?branch=release-2.0)](https://travis-ci.org/audiojs/audio-speaker) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

Note: Browser implementation is deprecated and will be replaced soon.

## Install

Node: `npm install audio-speaker`
Browser: `npm install audio-speaker --no-optional`

## Usage

Accepts options in main function:

 - channels (default 1)
 - sampleRate (default 44100)
 - endianess (default 'LE')
 - bitDepth (default 16)
 - signed (default true)
 - float (default false)
 - autoFlush (default false)

More documentation on these options will be added soon.

### Usage

```js
var speaker = require('audio-speaker');
var write = speaker();
write(audioBuffer|data, callback);
```

### Example

```js
var speaker = require('audio-speaker')
var generator = require('audio-generator')

var write = speaker({ autoFlush: true })
var generate = generator(t => Math.sin(t * Math.PI * 2 * 440))

(function loop (err, chunk) {
  if (err || chunk < 1) {
    return
  } else {
    write(generate(), (err, chunk) => {
      loop(err, chunk)
    })
  }
})();
```

#### Also see

> [mpg123](https://github.com/audiojs/mpg123) - modifications to mpg123 to suit audio-speaker.<br/>
> [web-audio-stream](https://github.com/audiojs/web-audio-stream) — stream data to web-audio.<br/>
> [audio-through](http://npmjs.org/package/audio-through) — universal stream for processing audio.<br/>
> [audio-feeder](https://github.com/brion/audio-feeder) — cross-browser speaker for pcm data.<br/>
