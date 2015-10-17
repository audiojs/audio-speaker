var Speaker = require('./');
var Generator = require('audio-generator');

var generator = Generator({
	generate: function (time) {
		return [
			Math.sin(Math.PI * 2 * time * 442) / 5,
			Math.sin(Math.PI * 2 * time * 438) / 5
		]
	},
	duration: 2,
	float: true
});

var speaker = Speaker({
	float: true
});

generator.pipe(speaker);