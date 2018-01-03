'use strict'
var wrap = require('module').wrap
var bench = require('fastbench')
var pino = require('pino')
var fs = require('fs')
var dest = process.platform === 'win32' ? fs.createWriteStream('\\\\.\\NUL') : fs.createWriteStream('/dev/null')
var plog = pino(dest)

process.env.DEBUG = 'dlog'
var dlog = require('debug')('dlog')
dlog.log = function (s) { dest.write(s) }

delete require.cache[require.resolve('debug')]
delete require.cache[require.resolve('debug/src/debug.js')]
delete require.cache[require.resolve('debug/src/node')]

delete require.cache[require.resolve('pino')]
pino = require('pino')
require('../')(pino({level: 'debug'}, dest))
var pdlog = require('debug')('dlog')

delete require.cache[require.resolve('debug')]
delete require.cache[require.resolve('debug/src/debug.js')]
delete require.cache[require.resolve('debug/src/node')]
delete require.cache[require.resolve('../')]
delete require.cache[require.resolve('../debug')]
require('module').wrap = wrap

delete require.cache[require.resolve('pino')]
pino = require('pino')
require('../')(pino({extreme: true, level: 'debug'}, dest))
var pedlog = require('debug')('dlog')

var deep = require('../package.json')
deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)))
deep.deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)))
deep.deep.deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)))

var max = 10

var run = bench([
  function benchPinoDeepObj (cb) {
    for (var i = 0; i < max; i++) {
      plog.info(deep)
    }
    setImmediate(cb)
  },
  function benchDebugDeepObj (cb) {
    for (var i = 0; i < max; i++) {
      dlog(deep)
    }
    setImmediate(cb)
  },
  function benchPinoDebugDeepObj (cb) {
    for (var i = 0; i < max; i++) {
      pdlog(deep)
    }
    setImmediate(cb)
  },
  function benchPinoExtremeDebugDeepObj (cb) {
    for (var i = 0; i < max; i++) {
      pedlog(deep)
    }
    setImmediate(cb)
  }
], 10000)

run(run)
