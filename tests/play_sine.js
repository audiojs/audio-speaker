var test = require('tape')

var AudioGenerator = require('audio-generator/index')
var AudioSpeaker = require('../index')

test('play sine for 4 seconds', t => {
  var generate = AudioGenerator(time => {
    return Math.sin(Math.PI * 2 * time * 500)
  }, { duration: 4 })

  var write = AudioSpeaker({ channels: 1, float: false, bitDepth: 16, signed: true });

  setTimeout(() => {
		write.end(false, (err) => {
      err ? t.error(err) : t.pass('Output successful.')
    })
  }, 4000);

  (function loop (err, chunk) {
    if (err || chunk < 1) {
      return
    } else {
      write(generate(), (err, chunk) => {
        loop(err, chunk)
      })
    }
  })();

  t.end()
})
