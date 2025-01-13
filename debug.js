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
    const message = util.format.apply(util, arguments) // this is how debug.js formats argeuments
    return log.apply(logger, [message])
  }
  enabled.enabled = true

  const fn = debug.enabled(namespace) ? enabled : disabled
  fn.extend = function (subNamespace, delimiter) {
    return debug(namespace + (delimiter || ':') + subNamespace)
  }

  fn.namespace = namespace

  return fn
}
