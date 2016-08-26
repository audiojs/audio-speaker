var inherits = require('inherits');
var WAAStream = require('web-audio-stream/writable');


module.exports = Speaker;


inherits(Speaker, WAAStream);


function Speaker(options) {
	if (!(this instanceof Speaker)) return new Speaker(options);

	WAAStream.call(this, options);

	this.connect(this.context.destination);
}

Speaker.prototype.mode = WAAStream.BUFFER_MODE;
