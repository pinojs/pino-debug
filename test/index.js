'use strict'

const path = require('path')
const {exec, execSync} = require('child_process')
const tap = require('tap')
const through = require('through2')
const test = tap.test

const debugModules = [
  // <= 2.4
  [
    'debug/node.js',
    'debug/debug.js'
  ],
  // <= 4.0.1
  [
    'debug/node.js',
    'debug/src/node.js',
    'debug/src/debug.js'
  ],
  [
    'debug/src/node.js',
    'debug/src/common.js'
  ]
]

const commonModules = [
  'debug',
  '../debug',
  '../',
  './'
]

tap.afterEach(() => {
  let err = null
  for (const modules of debugModules) {
    try {
      commonModules.concat(modules)
        .map(m => require.resolve(m))
        .forEach(k => delete require.cache[k])
      err = null
      break
    } catch (e) {
      err = e
    }
  }
  if (err) {
    throw err
  }
  process.env.DEBUG = ''
})

test('throws if called more than once', (t) => {
  const pinoDebug = require('../')
  t.throws(() => {
    pinoDebug()
    pinoDebug()
  })
  t.end()
})

test('throws if debug is called after requiring but before calling pinoDebug', (t) => {
  require('../')
  const debug = require('debug')
  t.throws(() => debug('ns'))
  t.end()
})

test('captures any calls to `debug` and passes them through pino logger', (t) => {
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns')
    t.end()
  })
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
})

test('defaults to calling pinoInstance.debug', (t) => {
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns')
    t.equal(obj.level, 20)
    t.end()
  })
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
})

test('when passed no args, creates a standard pino logger with log level set to debug and logs to it\'s debug method', (t) => {
  const debug = path.join(__dirname, '..')
  const program = `
    var pinoDebug = require('${debug}')
    var write = process.stdout.write
    pinoDebug()
    var debug = require('debug')
    debug.enable('ns')
    debug('ns')('test')
  `

  exec(`${process.argv[0]} -e "${program}"`, (err, stdout, stderr) => {
    t.error(err)
    console.log(stdout.toString())
    console.log(stderr.toString())
    const line = stdout.toString()
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns')
    t.equal(obj.level, 20)
    t.end()
  })


})

test('passes debug args to pino log method according to opts.map', (t) => {
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns')
    t.equal(obj.level, 30)
    t.end()
  })
  pinoDebug(require('pino')(stream), { map: { ns: 'info' } })
  const debug = require('debug')
  debug('ns')('test')
})

test('passes debug args to pino log method according to opts.map when auto is off but namespaces have been enabled', (t) => {
  const pinoDebug = require('../')
  const ns = (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns')
    t.equal(obj.level, 30)
  }
  const ns2 = (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test2')
    t.equal(obj.ns, 'ns2')
    t.equal(obj.level, 40)
  }
  const stream = through((line, _, cb) => {
    if (!ns.called) {
      ns(line)
      ns.called = true
      cb()
      return
    }
    ns2(line)
    t.end()
  })

  pinoDebug(require('pino')(stream), { auto: false, map: { ns: 'info', ns2: 'warn' } })
  let debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
  debug = require('debug')
  debug.enable('ns2')
  debug('ns2')('test2')
})

test('does not pass debug args to pino log method according to opts.map when auto is off and namespaces have not been enabled', (t) => {
  const pinoDebug = require('../')

  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test2')
    t.equal(obj.ns, 'ns2')
    t.equal(obj.level, 40)
    t.end()
    cb()
  })

  pinoDebug(require('pino')(stream), { auto: false, map: { ns: 'info', ns2: 'warn' } })
  const debug = require('debug')
  debug.enable('ns2')
  debug('ns')('test')
  debug('ns2')('test2')
})

test('when preloaded with -r, automatically logs all debug calls with log level debug to a default pino logger', (t) => {
  const program = `
    var debug = require('debug')
    debug('ns')('test')
  `
  const debug = path.join(__dirname, '..')
  const line = execSync(`${process.argv[0]} -r ${debug} -e "${program}"`, { env: { DEBUG: '*' } }).toString()
  const obj = JSON.parse(line)
  t.equal(obj.msg, 'test')
  t.equal(obj.ns, 'ns')
  t.equal(obj.level, 20)
  t.end()
})

test('opts.skip filters out any matching namespaces', (t) => {
  const pinoDebug = require('../')

  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns')
    t.equal(obj.level, 30)
    t.end()
    cb()
  })

  pinoDebug(require('pino')(stream), {
    map: { 'ns*': 'info' },
    skip: ['ns2']
  })
  const debug = require('debug')
  debug('ns2')('test2')
  debug('ns')('test')
})

test('when there is a match conflict, log level is set to most precise match', (t) => {
  const pinoDebug = require('../')

  const queue = [(line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns')
    t.equal(obj.level, 30)
  }, (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test2')
    t.equal(obj.ns, 'ns2')
    t.equal(obj.level, 40)
  }, (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test3')
    t.equal(obj.ns, 'meow')
    t.equal(obj.level, 50)
  }, (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test4')
    t.equal(obj.ns, 'izikilla')
    t.equal(obj.level, 60)
  }, (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test5')
    t.equal(obj.ns, 'testtracetest')
    t.equal(obj.level, 10)
  }, (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test6')
    t.equal(obj.ns, 'debugtra')
    t.equal(obj.level, 20)
  }, (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test7')
    t.equal(obj.ns, 'ns3')
    t.equal(obj.level, 20)
  }, (line) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test8')
    t.equal(obj.ns, 'testbla')
    t.equal(obj.level, 30)
  }]

  const stream = through((line, _, cb) => {
    queue.shift()(line)
    cb()
    if (!queue.length) t.end()
  })

  pinoDebug(require('pino')({ level: 'trace' }, stream), {
    map: {
      '*tra': 'debug',
      '*bla': 'info',
      '*': 'error',
      '*killa': 'fatal',
      ns2: 'warn',
      ns3: 'debug',
      'ns*': 'info',
      '*trace*': 'trace'
    }
  })
  const debug = require('debug')
  debug('ns')('test')
  debug('ns2')('test2')
  debug('meow')('test3')
  debug('izikilla')('test4')
  debug('testtracetest')('test5')
  debug('debugtra')('test6')
  debug('ns3')('test7')
  debug('testbla')('test8')
})

test('uses native `Object` regardless of wrapped file contents', (t) => {
  t.doesNotThrow(() => require('./fixtures/object-override'))
  t.end()
})

test('keeps line numbers consistent', (t) => {
  require('../')
  const lineNums = require('./fixtures/line-numbers')
  const line = lineNums()
  t.equal(line, 4)

  t.end()
})

test('results in valid syntax when source has trailing comment', (t) => {
  t.doesNotThrow(() => require('./fixtures/trailing-comment'))
  t.end()
})

test('preserves DEBUG env independently from debug module', (t) => {
  process.env.DEBUG = 'ns1'
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, 'ns1')
    t.end()
  })
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug('ns1')('test')
})

test('supports extend method', (t) => {
  process.env.DEBUG = '*'
  const pinoDebug = require('../')
  const ns = ['ns1', 'ns1:ns2', 'ns1;ns2']
  let count = 0
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    t.equal(obj.msg, 'test')
    t.equal(obj.ns, ns[count++])
    cb()
  }, () => t.end())
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug('ns1')('test')
  debug('ns1').extend('ns2')('test')
  debug('ns1').extend('ns2', ';')('test')
  stream.end()
})

test('does not invalidate strict mode', (t) => {
  t.equal(require('./fixtures/strict-mode'), true)
  t.end()
})
