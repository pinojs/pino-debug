'use strict'

const util = require('util')

module.exports = debug

function debug (namespace) {
  if (!debug.logger) {
    throw Error('debug called before pino-debug initialized, ' +
   'register pino-debug at the top of your entry point')
  }

  const logger = debug.logger.child({ ns: namespace })
  const log = Array.from(debug.map.keys()).map(function (rx) {
    return rx.test(namespace) && logger[debug.map.get(rx)]
  }).filter(Boolean)[0] || logger.debug

  function disabled () {}
  disabled.enabled = false
  function enabled () {
    // Detect pino's object-first logging pattern: first arg is a plain object or Error with additional args
    // This preserves structured logging: debug({data: 'test'}, 'message') -> {ns: 'x', data: 'test', msg: 'message'}
    // And proper error serialization: debug(err, 'message') -> {ns: 'x', err: {...}, msg: 'message'}
    const isObjectFirst = arguments.length > 1 &&
      typeof arguments[0] === 'object' &&
      arguments[0] !== null &&
      (arguments[0].constructor === Object || arguments[0] instanceof Error)

    if (isObjectFirst) {
      // Pass arguments directly to pino to preserve structured logging or error serialization
      return log.apply(logger, arguments)
    } else {
      // Use util.format for debug.js style formatting (PR #134)
      const message = util.format.apply(util, arguments)
      return log.apply(logger, [message])
    }
  }
  enabled.enabled = true

  const fn = debug.enabled(namespace) ? enabled : disabled
  fn.extend = function (subNamespace, delimiter) {
    return debug(namespace + (delimiter || ':') + subNamespace)
  }

  fn.namespace = namespace

  return fn
}
