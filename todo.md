* Restrain buffers piping to node-speaker, bind to RT. Do not generate more than needed.
	* node-speaker restrains pressure, but with a 3s buffer - it should be able to be regulated.
* replace node-speaker with good implementation. It fails on estimating big buffers
* Decrease buffer, significantly. Make gain work realtime
* Flash fallback
* Create scriptProcessorNode mode. As an alternative.
* For old browsers generate sound like t='data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA',new Audio(t+btoa(t+S)).play()
	* http://www.p01.org/JS1K_Speech_Synthesizer/

* Detect audioBufferSize based on some performance measure, to avoid GC glitches
* Test in Firefox, Opera, Safari, iOS Safari, IE, others.

* Test variety of channels
* Test different sample rates

* CLI