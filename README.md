# pino-debug [![stability][0]][1]
[![npm version][2]][3] [![build status][4]][5] [![test coverage][6]][7]
[![downloads][8]][9] [![dependencies freshness][14]][15] [![js-standard-style][10]][11]

High performance debug logging. 

Seamlessly integrates the [`debug`][12] module with the high performance [`pino`][13] 
logger so you can turn on debug logs in production scenarios 
with minimum overhead.

* Up to 10x faster than using [`debug`][12] (20x in extreme mode!)
* JSON output with more detail (`pino`/`bunyan`/`bole` format)
* Safe with circular references ([`debug`][12] isn't)
* No need to replace any `debug` logging calls
* Associate namespaces with log levels
* Compatible with the entire pino ecosystem

## Installation
```sh
$ npm install --save pino-debug
```

## Usage

### Preload

If all you want is fast JSON logging to STDOUT

```sh
$ DEBUG=* node -r pino-debug app.js
```

Namespaces are enabled the usual way, via the `DEBUG` 
environment variable. 

The namespace is also included in the log output, in the `ns` key.

Here's a sample log when the above is applied to a generic express app:

```json
{"pid":8784,"hostname":"Davids-MacBook-Pro.local","level":20,"time":1480277659273,"msg":"skip empty body","ns":"body-parser:json","v":1}
```

### Programmatic

For fine grained control over output stream, and mappings
between [`debug`][12] namespaces and [`pino`][13] logger levels,
supply a [`pino`][13] instance and an optional options object with
a `map` property containing mappings.

**NOTE**: `pino-debug` **must** be required at the entry point of your node process,
before any other modules have been loaded 

Again this example assumes a generic `express` app:

```js
const pinoDebug = require('pino-debug')
const logger = require('pino')({level: process.env.LEVEL || 'info'}, process.stderr);
pinoDebug(logger, {
  auto: true, // default
  map: {
    'example:server': 'info',
    'express:router': 'debug',
    '*': 'trace' // everything else - trace
  }
})
```

The `auto` option turns on any namespaces listed in the `map` object 
(so we don't have to use the `DEBUG` environment variable to turn them on).

## API

**NOTE**: `pino-debug` can only be called **once**.

### pinoDebug(pinoInstance) => undefined

Call `pino-debug` with a [`pino`][13] logger instance only and any debug namespaces 
enabled via `DEBUG` or `debug.enable` will be logged with the level 20 (`'debug'`). 

Remember, if you want to see the messages you need to set the [`pino`][13] logger instance
logging level to `'debug'`.

### pinoDebug() => undefined

Call `pino-debug` without arguments and a default [`pino`][13] instance will be created with 
the logging level set to 20 (`'debug'` level). 

Any debug namespaces enabled via `DEBUG` or `debug.enable` will be logged 
with the level 20 (`'debug'`). 

### pinoDebug(pinoInstance, opts) => undefined

This is the recommended usage. Call `pino-debug` with a [`pino`][13] logger instance, 
and an `opts` object containining `map` property. 

#### `opts.map` `{'debug-namespace: 'pino-loglevel-label'}`

The keys of the `map` property correspond to the same namespaces that can be 
set on the `DEBUG` environment variable: 

```js
pinoDebug(pinoInstance, {
  map: {
    'my-app': 'info',
    'some-dep:*': 'debug',
    '*': 'trace'
  }
})
```

#### `opts.auto` `[true] | false`

If `true` (default) any debug namespaces found in the keys of `opts.map` will be
enabled.  

Additionally, any debug namespaces enabled via `DEBUG` or `debug.enable` 
will be logged with the level 20 (`'debug'`). 

If `false`, any namespaces that appear in `opts.map` **and** are enabled via 
`DEBUG` or `debug.enable` will be logged to with the corresponding log level,
(as specified in the `opts.map`). Any not specified in `opts.map`, but which
are enabled via `DEBUG` or `debug.enable` will be logged with the level 20 (`'debug'`). 

#### `opts.skip` `Array`

Equivalent of prefixing a namespace with dash (`-`) when specifying
`DEBUG` namespaces. Any namespaces specified will not be logged.

## Benchmarks

```sh
$ npm run bench
```

```sh
==========
basic averages
Pino average: 249
Debug average: 395
PinoDebug average: 244
PinoExtremeDebug average: 119
==========
==========
object averages
PinoObj average: 262
DebugObj average: 2448
PinoDebugObj average: 256
PinoExtremeDebugDeepObj average: 126
==========
==========
deepobject averages
PinoDeepObj average: 4809
DebugDeepObj average: 30083
PinoDebugDeepObj average: 4793
PinoExtremeDebugDeepObj average: 4810
==========
```

## Example Folder

The example folder has a generic `express` app, with some additions.

The `package.json` file has the following `scripts`:

```
  "start": "node ./bin/www",
  "start-preload": "DEBUG=* node -r ../ ./bin/www",
  "start-programmatic": "./bin/www-programmatic",
  "start-programmatic-debug": "LEVEL=debug ./bin/www-programmatic",
  "start-programmatic-trace": "LEVEL=trace ./bin/www-programmatic"
```

The `start-preload` script demonstrates preload usage. It set's 
the `DEBUG` environment variable to log everything, 
and then uses the `-r` flag to load `pino-debug` (relatively referenced).

The three scripts beginning `start-programmatic` all use a different
entry point where `pino-debug` has been required and instantiatd with
a [`pino`][13] instance and the mappings (as shown in usage examples). 

## License
[MIT](https://tldrlegal.com/license/mit-license)

## Acknowledgements
Sponsored by [nearForm](http://tldrlegal.com/license/mit-license)

[0]: https://img.shields.io/badge/stability-stable-green.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/npm/v/pino-debug.svg?style=flat-square
[3]: https://npmjs.org/package/pino-debug
[4]: https://img.shields.io/travis/pinojs/pino-debug/master.svg?style=flat-square
[5]: https://travis-ci.org/pinojs/pino-debug
[6]: https://img.shields.io/codecov/c/github/pinojs/pino-debug/master.svg?style=flat-square
[7]: https://codecov.io/github/pinojs/pino-debug
[8]: http://img.shields.io/npm/dm/pino-debug.svg?style=flat-square
[9]: https://npmjs.org/package/pino-debug
[10]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[11]: https://github.com/feross/standard
[12]: https://npm.im/debug
[13]: https://npm.im/pino
[14]: https://david-dm.org/pinojs/pino-debug/status.svg
[15]: https://david-dm.org/pinojs/pino-debug
