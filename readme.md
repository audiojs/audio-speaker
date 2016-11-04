#audio-speaker

> Output audio natively in node.

[![Build Status](https://api.travis-ci.org/audiojs/audio-speaker.svg?branch=release-2.0)](https://travis-ci.org/audiojs/audio-speaker) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)

## Usage

Accepts options in main function:

 - channels (default 2)
 - sampleRate (default 44100)
 - endianess (default 'LE')
 - bitDepth (default 16)
 - signed (default true)
 - float (default false)
 - autoFlush (default false)

More documentation on these options will be added soon.

We have some variety in the way you can write to the Speaker.

### Stream
```js
var speaker = require('audio-speaker/stream')
var generator = require('audio-generator/stream')

generator(function (time) {
  var p = Math.PI * 2
  return [Math.sin(p * time * 441), Math.sin(p * time * 439)]
}).pipe(speaker({ autoFlush: true }))
```

### Pull-stream
```js
var pull = require('pull-stream/pull')
var speaker = require('audio-speaker/pull')
var osc = require('audio-oscillator/pull')

pull(osc({frequency: 440}), speaker({ autoFlush: true }))
```

### Direct

```js
var speaker = require('audio-speaker')
var generator = require('audio-generator')

var output = speaker({ autoFlush: true })
var input = generator(t => Math.sin(t * Math.PI * 2 * 440))

(function loop (err, buf) {
  var buffer = input()
  output(buffer, loop)
})
```

## Credits

| ![connor][connor-avatar]      |
| :---------------------------: |
| [Connor Hartley][connor-link] |

Thanks to @jamen and @dustindowell22 for the mpg123 env configurations.

#### Related

> [mpg123](https://github.com/audiojs/mpg123) - modifications to mpg123 to suit audio-speaker.<br/>
> [web-audio-stream](https://github.com/audiojs/web-audio-stream) — stream data to web-audio.<br/>
> [audio-through](http://npmjs.org/package/audio-through) — universal stream for processing audio.<br/>
> [node-speaker](http://npmjs.org/package/speaker) — output pcm stream to speaker in node.<br/>
> [audio-feeder](https://github.com/brion/audio-feeder) — cross-browser speaker for pcm data.<br/>

  [connor-avatar]: https://avatars0.githubusercontent.com/u/12867785?v=3&s=125
  [connor-link]: https://github.com/connorhartley
