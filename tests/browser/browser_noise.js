'use strict'

var test = require('tape')

var util = require('audio-buffer-utils')
var AudioSpeaker = require('../../browser')

test('output audio buffer', t => {
	var write = AudioSpeaker()

	let buffer = util.create(10000)
	util.noise(buffer)

	write(buffer)
})
