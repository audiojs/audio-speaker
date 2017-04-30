/** @module  audio-speaker/browser */

'use strict';

var Writer = require('web-audio-stream/index');
var context = require('audio-context');

module.exports = Speaker;


function Speaker(options) {
	let ctx = options && options.context || context();

	return Writer(ctx.destination, options);
}
