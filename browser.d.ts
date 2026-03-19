export interface BrowserSpeakerOptions {
  sampleRate?: number
  channels?: number
  bitDepth?: 8 | 16 | 32
  context?: AudioContext
}

export interface WriteFn {
  (chunk: Uint8Array | null, cb?: (err: Error | null, frames?: number) => void): void
  end(): void
  flush(cb?: () => void): void
  close(): void
  backend: 'webaudio'
}

export default function Speaker(opts?: BrowserSpeakerOptions): WriteFn
