'use strict'

module.exports = debug

function debug (namespace) {
  if (!debug.logger) {
    throw Error('debug called before pino-debug initialized,' +
   'register pino-debug at the top of your entry point')
  }

  var logger = debug.logger.child({'ns': namespace})
  var log = Array.from(debug.map.keys()).map(function (rx) {
    return rx.test(namespace) && logger[debug.map.get(rx)]
  }).filter(Boolean)[0] || logger.debug

  function disabled () {}
  disabled.enabled = false
  function enabled () {
    return log.apply(logger, arguments)
  }
  enabled.enabled = true

  var fn = debug.enabled(namespace) ? enabled : disabled
  fn.extend = function (subNamespace, delimiter) {
    return debug(namespace + (delimiter || ':') + subNamespace)
  }

  fn.namespace = namespace

  return fn
}
