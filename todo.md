* Wrap node-speaker
	* Ensure simple ouput format
	* Discard samplesPerFrame, take any input chunk size
	* Accept planar input

* Detect audioBufferSize based on some performance measure, to avoid GC glitches
* Test in Firefox, Opera, Safari, iOS Safari, IE, others.

* Test variety of channels
* Test different sample rates
* Make conversion of any kind of input format - interleaved, float, etc, to single output buffer format

* GUI
* CLI