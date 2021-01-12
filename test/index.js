'use strict'
var execSync = require('child_process').execSync
var tap = require('tap')
var through = require('through2')
var test = tap.test

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

tap.afterEach((done) => {
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
  done()
})

test('throws if called more than once', (t) => {
  var pinoDebug = require('../')
  t.throw(() => {
    pinoDebug()
    pinoDebug()
  })
  t.end()
})

test('throws if debug is called after requiring but before calling pinoDebug', (t) => {
  require('../')
  var debug = require('debug')
  t.throw(() => debug('ns'))
  t.end()
})

test('captures any calls to `debug` and passes them through pino logger', (t) => {
  var pinoDebug = require('../')
  var stream = through((line, _, cb) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, 'ns')
    t.end()
  })
  pinoDebug(require('pino')({level: 'debug'}, stream))
  var debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
})

test('defaults to calling pinoInstance.debug', (t) => {
  var pinoDebug = require('../')
  var stream = through((line, _, cb) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, 'ns')
    t.is(obj.level, 20)
    t.end()
  })
  pinoDebug(require('pino')({level: 'debug'}, stream))
  var debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
})

test('when passed no args, creates a standard pino logger with log level set to debug and logs to it\'s debug method', (t) => {
  var program = `
    var pinoDebug = require('${__dirname}/../')
    var write = process.stdout.write
    pinoDebug()
    var debug = require('debug')
    debug.enable('ns')
    debug('ns')('test')
  `
  var line = execSync(`${process.argv[0]} -e "${program}"`).toString()
  var obj = JSON.parse(line)
  t.is(obj.msg, 'test')
  t.is(obj.ns, 'ns')
  t.is(obj.level, 20)
  t.end()
})

test('passes debug args to pino log method according to opts.map', (t) => {
  var pinoDebug = require('../')
  var stream = through((line, _, cb) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, 'ns')
    t.is(obj.level, 30)
    t.end()
  })
  pinoDebug(require('pino')(stream), {map: {ns: 'info'}})
  var debug = require('debug')
  debug('ns')('test')
})

test('passes debug args to pino log method according to opts.map when auto is off but namespaces have been enabled', (t) => {
  var pinoDebug = require('../')
  var ns = (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, 'ns')
    t.is(obj.level, 30)
  }
  var ns2 = (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test2')
    t.is(obj.ns, 'ns2')
    t.is(obj.level, 40)
  }
  var stream = through((line, _, cb) => {
    if (!ns.called) {
      ns(line)
      ns.called = true
      cb()
      return
    }
    ns2(line)
    t.end()
  })

  pinoDebug(require('pino')(stream), {auto: false, map: {ns: 'info', ns2: 'warn'}})
  var debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
  debug = require('debug')
  debug.enable('ns2')
  debug('ns2')('test2')
})

test('does not pass debug args to pino log method according to opts.map when auto is off and namespaces have not been enabled', (t) => {
  var pinoDebug = require('../')

  var stream = through((line, _, cb) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test2')
    t.is(obj.ns, 'ns2')
    t.is(obj.level, 40)
    t.end()
    cb()
  })

  pinoDebug(require('pino')(stream), {auto: false, map: {ns: 'info', ns2: 'warn'}})
  var debug = require('debug')
  debug.enable('ns2')
  debug('ns')('test')
  debug('ns2')('test2')
})

test('when preloaded with -r, automatically logs all debug calls with log level debug to a default pino logger', (t) => {
  var program = `
    var debug = require('debug')
    debug('ns')('test')
  `
  var line = execSync(`${process.argv[0]} -r ${__dirname}/../ -e "${program}"`, {env: {DEBUG: '*'}}).toString()
  var obj = JSON.parse(line)
  t.is(obj.msg, 'test')
  t.is(obj.ns, 'ns')
  t.is(obj.level, 20)
  t.end()
})

test('opts.skip filters out any matching namespaces', (t) => {
  var pinoDebug = require('../')

  var stream = through((line, _, cb) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, 'ns')
    t.is(obj.level, 30)
    t.end()
    cb()
  })

  pinoDebug(require('pino')(stream), {
    map: {'ns*': 'info'},
    skip: ['ns2']
  })
  var debug = require('debug')
  debug('ns2')('test2')
  debug('ns')('test')
})

test('when there is a match conflict, log level is set to most precise match', (t) => {
  var pinoDebug = require('../')

  var queue = [(line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, 'ns')
    t.is(obj.level, 30)
  }, (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test2')
    t.is(obj.ns, 'ns2')
    t.is(obj.level, 40)
  }, (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test3')
    t.is(obj.ns, 'meow')
    t.is(obj.level, 50)
  }, (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test4')
    t.is(obj.ns, 'izikilla')
    t.is(obj.level, 60)
  }, (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test5')
    t.is(obj.ns, 'testtracetest')
    t.is(obj.level, 10)
  }, (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test6')
    t.is(obj.ns, 'debugtra')
    t.is(obj.level, 20)
  }, (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test7')
    t.is(obj.ns, 'ns3')
    t.is(obj.level, 20)
  }, (line) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test8')
    t.is(obj.ns, 'testbla')
    t.is(obj.level, 30)
  }]

  var stream = through((line, _, cb) => {
    queue.shift()(line)
    cb()
    if (!queue.length) t.end()
  })

  pinoDebug(require('pino')({level: 'trace'}, stream), {
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
  var debug = require('debug')
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
  var lineNums = require('./fixtures/line-numbers')
  var line = lineNums()
  t.is(line, 4)

  t.end()
})

test('results in valid syntax when source has trailing comment', (t) => {
  t.doesNotThrow(() => require('./fixtures/trailing-comment'))
  t.end()
})

test('preserves DEBUG env independently from debug module', (t) => {
  process.env.DEBUG = 'ns1'
  var pinoDebug = require('../')
  var stream = through((line, _, cb) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, 'ns1')
    t.end()
  })
  pinoDebug(require('pino')({level: 'debug'}, stream))
  var debug = require('debug')
  debug('ns1')('test')
})

test('supports extend method', (t) => {
  process.env.DEBUG = '*'
  var pinoDebug = require('../')
  var ns = ['ns1', 'ns1:ns2', 'ns1;ns2']
  var count = 0
  var stream = through((line, _, cb) => {
    var obj = JSON.parse(line)
    t.is(obj.msg, 'test')
    t.is(obj.ns, ns[count++])
    cb()
  }, () => t.end())
  pinoDebug(require('pino')({level: 'debug'}, stream))
  var debug = require('debug')
  debug('ns1')('test')
  debug('ns1').extend('ns2')('test')
  debug('ns1').extend('ns2', ';')('test')
  stream.end()
})

test('does not invalidate strict mode', (t) => {
  t.is(require('./fixtures/strict-mode'), true)
  t.end()
})
