import createContext from 'audio-context'
import createWriter from 'web-audio-write'

export default function Speaker (opts) {
  opts = Object.assign({
    channels: 2,
    sampleRate: 44100
  }, opts)

  var ctx = opts.context || createContext(opts)
  var write = createWriter(ctx.destination)

  return write
}
