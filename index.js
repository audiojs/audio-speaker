'use strict'

module.exports =
  require('is-browser')
  ? require('./browser')
  : require('./node')
