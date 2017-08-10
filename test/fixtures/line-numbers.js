module.exports = function lineNum () {
  var orig = Error.prepareStackTrace
  Error.prepareStackTrace = function (_, stack) { return stack }
  var err = new Error()
  var stack = err.stack
  Error.prepareStackTrace = orig
  return stack[0].getLineNumber()
}
