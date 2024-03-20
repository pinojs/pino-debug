'use strict'
const wrap = require('module').wrap
const bench = require('fastbench')
let pino = require('pino')
const fs = require('fs')
const dest = process.platform === 'win32' ? fs.createWriteStream('\\\\.\\NUL') : fs.createWriteStream('/dev/null')
const plog = pino(dest)

process.env.DEBUG = 'dlog'
const dlog = require('debug')('dlog')
dlog.log = function (s) { dest.write(s) }

delete require.cache[require.resolve('debug')]
delete require.cache[require.resolve('debug/src/debug.js')]
delete require.cache[require.resolve('debug/src/node')]

delete require.cache[require.resolve('pino')]
pino = require('pino')
require('../')(pino({ level: 'debug' }, dest))
const pdlog = require('debug')('dlog')

delete require.cache[require.resolve('debug')]
delete require.cache[require.resolve('debug/src/debug.js')]
delete require.cache[require.resolve('debug/src/node')]
delete require.cache[require.resolve('../')]
delete require.cache[require.resolve('../debug')]
require('module').wrap = wrap

require('../')(pino({ extreme: true, level: 'debug' }, dest))
const pedlog = require('debug')('dlog')

const max = 10

const run = bench([
  function benchPinoObj (cb) {
    for (let i = 0; i < max; i++) {
      plog.info({ hello: 'world' })
    }
    setImmediate(cb)
  },
  function benchDebugObj (cb) {
    for (let i = 0; i < max; i++) {
      dlog({ hello: 'world' })
    }
    setImmediate(cb)
  },
  function benchPinoDebugObj (cb) {
    for (let i = 0; i < max; i++) {
      pdlog({ hello: 'world' })
    }
    setImmediate(cb)
  },
  function benchPinoExtremeDebugDeepObj (cb) {
    for (let i = 0; i < max; i++) {
      pedlog({ hello: 'world' })
    }
    setImmediate(cb)
  }
], 10000)

run(run)
