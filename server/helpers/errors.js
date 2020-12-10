class UnreachableCaseError extends Error {
  constructor(val) {
    super(`Unreachable case: ${val}`)
  }
}

module.exports = {
  UnreachableCaseError
}
