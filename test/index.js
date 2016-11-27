var test = require('tap').test

test('throws if called more than once')

test('throws if debug is called after requiring but before calling pinoDebug')

test('captures any calls to `debug` and passes them through pino logger')

test('defaults to calling pinoInstance.debug')

test('when passed no args, creates a standard pino logger and logs to it\'s debug method')

test('passes debug args to pino log method according to opts.map')

test('passes debug args to pino log method according to opts.map when autoenable is off but namespaces have been enabled')

test('does not pass debug args to pino log method according to opts.map when autoenable is off and namespaces have not been enabled')

test('opts.skip filters out any matching namespaces')

test('when there is a match conflict, log level is set to most precise match')
