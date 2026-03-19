/**
 * @module audio-speaker/stream
 *
 * Writable stream interface for audio-speaker.
 */
import { Writable } from 'node:stream'
import Speaker from './index.js'

export default class SpeakerStream extends Writable {
  constructor(opts) {
    super()
    this._opts = opts
    this._write_fn = null
    this._ready = this._init()
  }

  async _init() {
    this._write_fn = await Speaker(this._opts)
  }

  _write(chunk, encoding, cb) {
    this._ready.then(() => {
      this._write_fn(chunk, (err) => cb(err || null))
    }, cb)
  }

  _final(cb) {
    this._ready.then(() => {
      this._write_fn.flush(() => {
        this._write_fn.close()
        cb()
      })
    }, cb)
  }

  _destroy(err, cb) {
    if (this._write_fn) this._write_fn.close()
    cb(err)
  }
}
