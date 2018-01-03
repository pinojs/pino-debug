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

var max = 10
var run = bench([
  function benchPino (cb) {
    for (var i = 0; i < max; i++) {
      plog.info('hello world')
    }
    setImmediate(cb)
  },
  function benchDebug (cb) {
    for (var i = 0; i < max; i++) {
      dlog('hello world')
    }
    setImmediate(cb)
  },
  function benchPinoDebug (cb) {
    for (var i = 0; i < max; i++) {
      pdlog('hello world')
    }
    setImmediate(cb)
  },
  function benchPinoExtremeDebug (cb) {
    for (var i = 0; i < max; i++) {
      pedlog('hello world')
    }
    setImmediate(cb)
  }
], 10000)

run(run)
