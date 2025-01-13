module.exports = function lineNum () {
  const orig = Error.prepareStackTrace
  Error.prepareStackTrace = function (_, stack) { return stack }
  const err = new Error()
  const stack = err.stack
  Error.prepareStackTrace = orig
  return stack[0].getLineNumber()
}
