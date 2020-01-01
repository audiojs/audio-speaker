const Speaker = require('speaker')

module.export = function createSpeaker(opts) {
  const speaker = new Speaker({
    channels: 2,
    bitDepth: 16,
    sampleRate: 44100
  })

  return (data) => {
    speaker.write(data)
  }
}
