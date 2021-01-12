'use strict'

eval('var test = 123')

// This will evaluate to `true` if strict mode is enabled
module.exports = typeof test === 'undefined'
