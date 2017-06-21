'use strict'

const t = require('tape')
const util = require('audio-buffer-utils')
const createSpeaker = require('../')

t('output AudioBuffer', t => {
	let speaker = createSpeaker()

	let buf = util.create(10000)
	util.noise(buf)

	speaker(buf)
})
