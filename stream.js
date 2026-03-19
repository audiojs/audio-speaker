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
    this._closed = false
    this._ready = this._init()
  }

  async _init() {
    this._write_fn = await Speaker(this._opts)
    // if destroy was called during init, close immediately
    if (this._closed) this._write_fn.close()
  }

  _write(chunk, encoding, cb) {
    this._ready.then(() => {
      if (this._closed) return cb()
      this._write_fn(chunk, (err) => cb(err || null))
    }, cb)
  }

  _final(cb) {
    this._ready.then(() => {
      if (this._closed) return cb()
      this._write_fn.flush(() => {
        this._write_fn.close()
        cb()
      })
    }, cb)
  }

  _destroy(err, cb) {
    this._closed = true
    if (this._write_fn) this._write_fn.close()
    cb(err)
  }
}
