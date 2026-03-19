# v2

* [x] Native miniaudio N-API addon (async write, ring buffer, capture, GC finalizer)
* [x] Backend cascade: miniaudio → process fallback
* [x] ESM, zero runtime deps, Node >=18
* [x] Stream (Writable), browser (Web Audio API)
* [x] Platform packages: @audio/speaker-{platform}-{arch} (5 platforms built)
* [x] Tests: 18 pass, tst (browser+node), CI green (3 OS × 3 Node)
* [ ] Publish to npm
* [ ] Backpressure: expose ring buffer pressure to stream highWaterMark
