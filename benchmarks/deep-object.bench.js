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

delete require.cache[require.resolve('pino')]
pino = require('pino')
require('../')(pino({ extreme: true, level: 'debug' }, dest))
const pedlog = require('debug')('dlog')

const deep = require('../package.json')
deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)))
deep.deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)))
deep.deep.deep.deep = Object.assign({}, JSON.parse(JSON.stringify(deep)))

const max = 10

const run = bench([
  function benchPinoDeepObj (cb) {
    for (let i = 0; i < max; i++) {
      plog.info(deep)
    }
    setImmediate(cb)
  },
  function benchDebugDeepObj (cb) {
    for (let i = 0; i < max; i++) {
      dlog(deep)
    }
    setImmediate(cb)
  },
  function benchPinoDebugDeepObj (cb) {
    for (let i = 0; i < max; i++) {
      pdlog(deep)
    }
    setImmediate(cb)
  },
  function benchPinoExtremeDebugDeepObj (cb) {
    for (let i = 0; i < max; i++) {
      pedlog(deep)
    }
    setImmediate(cb)
  }
], 10000)

run(run)
