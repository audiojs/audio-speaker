* For old browsers generate sound like t='data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA',new Audio(t+btoa(t+S)).play()
	* http://www.p01.org/JS1K_Speech_Synthesizer/

* Detect audioBufferSize based on some performance measure, to avoid GC glitches
* Test in Firefox, Opera, Safari, iOS Safari, IE, others.

* Test variety of channels
* Test different sample rates
* Make conversion of any kind of input format - interleaved, float, etc, to single output buffer format

* GUI
* CLI