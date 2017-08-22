var tap = require('tap')
var through = require('through2')
var test = tap.test

tap.afterEach((done) => {
  var deps
  try {
    // debug 2.4 and down
    deps = [
      require.resolve('debug'),
      require.resolve('debug/node.js'),
      require.resolve('debug/debug.js'),
      require.resolve('../debug'),
      require.resolve('../'),
      require.resolve('./')
    ]
  } catch (e) {
    // debug 2.5 and up
    deps = [
      require.resolve('debug'),
      require.resolve('debug/node.js'),
      require.resolve('debug/src/node.js'),
      require.resolve('debug/src/debug.js'),
      require.resolve('../debug'),
      require.resolve('../'),
      require.resolve('./')
    ]
  }
  deps.forEach((k) => delete require.cache[k])
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
  var pinoDebug = require('../')
  var write = process.stdout.write
  process.stdout.write = function (line) {
    if (line[0] === '{') {
      process.stdout.write = write
      var obj = JSON.parse(line)
      t.is(obj.msg, 'test')
      t.is(obj.ns, 'ns')
      t.is(obj.level, 20)
      t.end()
    }
  }
  pinoDebug()
  var debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')
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

/*
test('when preloaded with -r, automatically logs all debug calls with log level debug to a default pino logger', (t) => {
  // emulate the preload environment
  var filename = module.filename
  var parent = module.parent
  var write = process.stdout.write
  module.filename = null
  module.parent = null
  process.stdout.write = (line) => {
    if (line[0] === '{') {
      process.stdout.write = write
      var obj = JSON.parse(line)
      t.is(obj.msg, 'test')
      t.is(obj.ns, 'ns')
      t.is(obj.level, 20)
      t.end()
    }
  }
  require('../')
  var debug = require('debug')
  debug.enable('ns')
  debug('ns')('test')

  module.filename = filename
  module.parent = parent
})
*/

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
