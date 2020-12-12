class InvalidCaseError extends Error {
  constructor(val) {
    super(`Invalid case: ${val}`)
  }
}

module.exports = {
  InvalidCaseError
}
