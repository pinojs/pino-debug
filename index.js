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
  var namespaces = []
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
  var pathToPinoDebug = require.resolve('./debug').replace(/\\/g, '\\\\')

  var head = `(function(exports, require, module, __filename, __dirname) {
      require = (function (req) {
        var Object = ({}).constructor
        return Object.setPrototypeOf(function pinoDebugWrappedRequire(s) {        
          var dirname = __dirname.slice(-22)
          var pathToPinoDebug = '${pathToPinoDebug}'
                    
          if (process.platform === 'win32') {
              dirname = dirname.replace(/\\\\/g, '/')
          }
          
          if (s === './debug' && /node_modules\\/debug/.test(dirname)) {
            var dbg = req(pathToPinoDebug)
            var real = req(s)
            Object.assign(dbg, real)
            Object.defineProperty(real, 'save', {get: function () {
              Object.defineProperty(real, 'save', {value: dbg.save})
              return real.save
            }, configurable: true})
            return dbg
          }
          return req(s)
        }, req)
      }(require));
  `.replace(/\n/g, ';').replace(/\s+/g, ' ').replace(/;+/g, ';')
  var tail = '\n});'

  return head + script + tail
}
