'use strict'

var pino = require('pino')
require('module').wrap = override
var debug = require('debug')

module.exports = pinoDebug

if (module.parent && module.parent.parent === null && module.parent.filename === null) {
  // preloaded with -r flag
  pinoDebug()
}

function pinoDebug (logger, opts) {
  if (pinoDebug.called) throw Error('pino-debug can only be called once')
  pinoDebug.called = true
  opts = opts || {}
  var auto = 'auto' in opts ? opts.auto : true
  var map = opts.map || {}
  var namespaces = getNamespaces()
  debug.map = Object.keys(map).sort(byPrecision).reduce(function (m, k) {
    if (auto) namespaces.push(k)
    m.set(RegExp('^' + k.replace(/[\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*?') + '$'), map[k])
    return m
  }, new Map())
  debug.logger = logger || pino({level: 'debug'})
  if (opts.skip) {
    opts.skip.map(function (ns) { return '-' + ns }).forEach(function (ns) { namespaces.push(ns) })
  }
  debug.enable(namespaces.join(','))
}

function getNamespaces () {
  var namespaces = process.env.DEBUG
  if (namespaces != null) {
    return (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/)
  }
  return []
}

function byPrecision (a, b) {
  var aix = a.indexOf('*')
  var bix = b.indexOf('*')
  if (aix === -1 && bix === -1) return 0
  if (~aix && ~bix) {
    if (aix > bix) return -1
    if (aix < bix) return 1
    return a.length < b.length ? 1 : (a.length === b.length ? 0 : -1)
  }
  return ~bix ? -1 : 1
}

function override (script) {
  // Escape backslashes to prevent from interpreting backslashes on Windows platform
  // during expression interpolation in ES6 template literal.
  // Without this change, Windows path retrieved from require.resolve (eg.
  // F:\Projekty\Learn\pino-debug\debug.js) will be interpreted during interpolation
  // as F:ProjektyLearnpino-debugdebug.js and node.js will throw error
  // Cannot find module 'F:ProjektyLearnpino-debugdebug.js'
  var pathToPinoDebug = require.resolve('./debug').replace(/\\/g, '\\\\')

  var head = `(function(exports, require, module, __filename, __dirname) {
      require = (function (req) {
        var pinoDebugOs = require('os')
        var pinoDebugPath = require('path')
        var Object = ({}).constructor
        return Object.setPrototypeOf(function pinoDebugWrappedRequire(s) {
          var dirname = __dirname.split(pinoDebugPath.sep)
          var lastNodeModulesIndex = dirname.lastIndexOf('node_modules')
          var isDebug = lastNodeModulesIndex >= 0 && dirname[lastNodeModulesIndex + 1] === 'debug'
          var pathToPinoDebug = '${pathToPinoDebug}'

          if (isDebug) {
            var dbg = req(pathToPinoDebug)
            var real = req(s)
            if (s === './common') {
              var wrapped = function pinoDebugWrapSetup(env) {
                var orig = real(env)
                Object.assign(dbg, orig)
                Object.defineProperty(orig, 'save', {get: function () {
                  Object.defineProperty(orig, 'save', {value: dbg.save})
                  return orig.save
                }, configurable: true})
                return dbg
              }
              return wrapped
            }
            if (s === './debug') {
              Object.assign(dbg, real)
              Object.defineProperty(real, 'save', {get: function () {
                Object.defineProperty(real, 'save', {value: dbg.save})
                return real.save
              }, configurable: true})
              return dbg
            }
          }
          return req(s)
        }, req)
      }(require))
      return (function(){
  `.trim().replace(/\n/g, ';').replace(/\s+/g, ' ').replace(/;+/g, ';')
  var tail = '\n}).call(this);})'

  return head + script + tail
}
