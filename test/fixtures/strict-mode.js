'use strict'

/* eslint-disable-next-line */
eval('var test = 123')

// This will evaluate to `true` if strict mode is enabled
module.exports = typeof test === 'undefined'
