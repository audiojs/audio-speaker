export interface SpeakerOptions {
  sampleRate?: number
  channels?: number
  bitDepth?: 8 | 16 | 24 | 32
  bufferSize?: number
  backend?: 'miniaudio' | 'process' | 'null'
}

export interface WriteFn {
  (chunk: Buffer | Uint8Array | AudioBuffer | null, cb?: (err: Error | null, frames?: number) => void): void
  end(): void
  flush(cb?: () => void): void
  close(): void
  backend: string
}

export default function speaker(opts?: SpeakerOptions): WriteFn
