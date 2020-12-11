const requestsHelpers = require('../requests')
const fixtures = require('../../jest/fixtures')

afterEach(() => {
  jest.clearAllMocks()
})

describe('requests helper methods', () => {
  describe('getAuthorizationRequestSlackBlocks', () => {
    it('should return correctly formatted blocks for authorizations created', () => {
      const result = requestsHelpers.getAuthorizationRequestSlackBlocks(
        fixtures.authorizationRequestCreatedEventBody
      )
      expect(result).toMatchSnapshot() 
    })

    it('should return correctly formatted blocks for authorizations cancelled/rejected', () => {
      const result = requestsHelpers.getAuthorizationRequestSlackBlocks(
        fixtures.authorizationRequestCancelledEventBody
      )
      expect(result).toMatchSnapshot() 
    })
  })

  describe('getContributionRequestSlackBlocks', () => {
    it('should return correctly formatted blocks for contributions created', () => {
      const result = requestsHelpers.getContributionRequestSlackBlocks(
        fixtures.contributionRequestCreatedEventBody
      )
      expect(result).toMatchSnapshot() 
    })

    it('should return correctly formatted blocks for contributions cancelled/rejected', () => {
      const result = requestsHelpers.getContributionRequestSlackBlocks(
        fixtures.contributionRequestCancelledEventBody
      )
      expect(result).toMatchSnapshot() 
    })
  })
})
