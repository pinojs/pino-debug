'use strict'

const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const pump = require('pump')
const split = require('split2')
const through = require('through2')
const steed = require('steed')

function usage () {
  return fs.createReadStream(path.join(__dirname, 'usage.txt'))
}

if (!process.argv[2]) {
  usage().pipe(process.stdout)
  process.exit()
}

let selectedBenchmark = process.argv[2].toLowerCase()
const benchmarkDir = path.resolve(__dirname)
const benchmarks = {
  basic: 'basic.bench.js',
  object: 'object.bench.js',
  deepobject: 'deep-object.bench.js'
}

function runBenchmark (name, done) {
  const benchmarkResults = {}
  benchmarkResults[name] = {}

  const processor = through(function (line, enc, cb) {
    const parts = ('' + line).split(': ')
    const parts2 = parts[0].split('*')
    const logger = parts2[0].replace('bench', '')

    if (!benchmarkResults[name][logger]) benchmarkResults[name][logger] = []

    benchmarkResults[name][logger].push({
      time: parts[1].replace('ms', ''),
      iterations: parts2[1].replace(':', '')
    })

    cb()
  })

  console.log('Running ' + name.toUpperCase() + ' benchmark\n')
  const benchmark = spawn(
    process.argv[0],
    [path.join(benchmarkDir, benchmarks[name])]
  )

  benchmark.stdout.pipe(process.stdout)
  pump(benchmark.stdout, split(), processor)

  benchmark.on('exit', function () {
    console.log('')
    if (done && typeof done === 'function') done(null, benchmarkResults)
  })
}

function sum (ar) {
  let result = 0
  for (let i = 0; i < ar.length; i += 1) {
    result += Number.parseFloat(ar[i].time)
  }
  return result
}

function displayResults (results) {
  console.log('==========')
  const benchNames = Object.keys(results)
  for (let i = 0; i < benchNames.length; i += 1) {
    console.log(benchNames[i] + ' averages')
    const benchmark = results[benchNames[i]]
    const loggers = Object.keys(benchmark)
    for (let j = 0; j < loggers.length; j += 1) {
      const logger = benchmark[loggers[j]]
      const average = Math.round(sum(logger) / logger.length)
      console.log(loggers[j] + ' average: ' + average)
    }
  }
  console.log('==========')
}

function toBench (done) {
  runBenchmark(this.name, done)
}

const benchQueue = []
if (selectedBenchmark !== 'all') {
  benchQueue.push(toBench.bind({ name: selectedBenchmark }))
} else {
  const keys = Object.keys(benchmarks)
  for (let i = 0; i < keys.length; i += 1) {
    selectedBenchmark = keys[i]
    benchQueue.push(toBench.bind({ name: selectedBenchmark }))
  }
}
steed.series(benchQueue, function (err, results) {
  if (err) return console.error(err.message)
  results.forEach(displayResults)
})
