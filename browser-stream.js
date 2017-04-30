/** @module  audio-speaker/browser */

'use strict';

var inherits = require('inherits');
var WAAStream = require('web-audio-stream/writable');
var context = require('audio-context');


module.exports = Speaker;


inherits(Speaker, WAAStream);


function Speaker(options) {
	if (!(this instanceof Speaker)) return new Speaker(options);

	let ctx = options && options.context || context();

	WAAStream.call(this, ctx.destination, options);
}
