'use strict'

const test = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const { exec, execSync } = require('node:child_process')
const through = require('through2')

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

test.afterEach(() => {
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

test('throws if called more than once', () => {
  const pinoDebug = require('../')
  assert.throws(() => {
    pinoDebug()
    pinoDebug()
  })
})

test('throws if debug is called after requiring but before calling pinoDebug', () => {
  require('../')
  const debug = require('debug')
  assert.throws(() => debug('ns'))
})

test('captures any calls to `debug` and passes them through pino logger', (t, end) => {
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns')
    end()
  })
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
})

test('defaults to calling pinoInstance.debug', (t, end) => {
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns')
    assert.equal(obj.level, 20)
    end()
  })
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
})

test('when passed no args, creates a standard pino logger with log level set to debug and logs to it\'s debug method', (t, end) => {
  const debug = path.join(__dirname, '..')
  const program = `
    var pinoDebug = require('${debug}')
    var write = process.stdout.write
    pinoDebug()
    var debug = require('debug')
    debug.enable('ns')
    debug('ns')('test')
  `

  exec(`${process.argv[0]} -e "${program}"`, (err, stdout) => {
    assert.equal(err, undefined)
    const line = stdout.toString()
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns')
    assert.equal(obj.level, 20)
    end()
  })
})

test('passes debug args to pino log method according to opts.map', (t, end) => {
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns')
    assert.equal(obj.level, 30)
    end()
  })
  pinoDebug(require('pino')(stream), { map: { ns: 'info' } })
  const debug = require('debug')
  debug('ns')('test')
})

test('passes debug args to pino log method according to opts.map when auto is off but namespaces have been enabled', (t, end) => {
  const pinoDebug = require('../')
  const ns = (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns')
    assert.equal(obj.level, 30)
  }
  const ns2 = (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test2')
    assert.equal(obj.ns, 'ns2')
    assert.equal(obj.level, 40)
  }
  const stream = through((line, _, cb) => {
    if (!ns.called) {
      ns(line)
      ns.called = true
      cb()
      return
    }
    ns2(line)
    end()
  })

  pinoDebug(require('pino')(stream), { auto: false, map: { ns: 'info', ns2: 'warn' } })
  let debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
  debug = require('debug')
  debug.enable('ns2')
  debug('ns2')('test2')
})

test('does not pass debug args to pino log method according to opts.map when auto is off and namespaces have not been enabled', (t, end) => {
  const pinoDebug = require('../')

  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test2')
    assert.equal(obj.ns, 'ns2')
    assert.equal(obj.level, 40)
    end()
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
  assert.equal(obj.msg, 'test')
  assert.equal(obj.ns, 'ns')
  assert.equal(obj.level, 20)
})

test('opts.skip filters out any matching namespaces', (t, end) => {
  const pinoDebug = require('../')

  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns')
    assert.equal(obj.level, 30)
    end()
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

test('when there is a match conflict, log level is set to most precise match', (t, end) => {
  const pinoDebug = require('../')

  const queue = [(line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns')
    assert.equal(obj.level, 30)
  }, (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test2')
    assert.equal(obj.ns, 'ns2')
    assert.equal(obj.level, 40)
  }, (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test3')
    assert.equal(obj.ns, 'meow')
    assert.equal(obj.level, 50)
  }, (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test4')
    assert.equal(obj.ns, 'izikilla')
    assert.equal(obj.level, 60)
  }, (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test5')
    assert.equal(obj.ns, 'testtracetest')
    assert.equal(obj.level, 10)
  }, (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test6')
    assert.equal(obj.ns, 'debugtra')
    assert.equal(obj.level, 20)
  }, (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test7')
    assert.equal(obj.ns, 'ns3')
    assert.equal(obj.level, 20)
  }, (line) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test8')
    assert.equal(obj.ns, 'testbla')
    assert.equal(obj.level, 30)
  }]

  const stream = through((line, _, cb) => {
    queue.shift()(line)
    cb()
    if (!queue.length) end()
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

test('uses native `Object` regardless of wrapped file contents', () => {
  assert.doesNotThrow(() => require('./fixtures/object-override'))
})

test('keeps line numbers consistent', () => {
  require('../')
  const lineNums = require('./fixtures/line-numbers')
  const line = lineNums()
  assert.equal(line, 4)
})

test('results in valid syntax when source has trailing comment', () => {
  assert.doesNotThrow(() => require('./fixtures/trailing-comment'))
})

test('preserves DEBUG env independently from debug module', (t, end) => {
  process.env.DEBUG = 'ns1'
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, 'ns1')
    end()
  })
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug('ns1')('test')
})

test('supports extend method', (t, end) => {
  process.env.DEBUG = '*'
  const pinoDebug = require('../')
  const ns = ['ns1', 'ns1:ns2', 'ns1;ns2']
  let count = 0
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    assert.equal(obj.msg, 'test')
    assert.equal(obj.ns, ns[count++])
    cb()
  }, () => end())
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')
  debug('ns1')('test')
  debug('ns1').extend('ns2')('test')
  debug('ns1').extend('ns2', ';')('test')
  stream.end()
})

test('does not invalidate strict mode', () => {
  assert.equal(require('./fixtures/strict-mode'), true)
})

test('Process all arguments debug.js style', (t, end) => {
  const testOptions = { option1: 'value1' }
  process.env.DEBUG = 'ns1'
  const pinoDebug = require('../')
  const stream = through((line, _, cb) => {
    const obj = JSON.parse(line)
    const expectedMsg = "test { option1: 'value1' }"
    assert.equal(obj.msg, expectedMsg)
    assert.equal(obj.ns, 'ns1')
    end()
  })
  pinoDebug(require('pino')({ level: 'debug' }, stream))
  const debug = require('debug')

  debug('ns1')('test', testOptions)
})
