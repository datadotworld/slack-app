const linksHelpers = require('../links')

describe('links helper methods', () => {
  describe('getOriginAndPortFromUrl', () => {
    it('should return the origin with a port if available', () => {
      const url = 'https://mydomain.com:80/svn/Repos/'
      expect(linksHelpers.getOriginFromUrl(url)).toEqual(
        'https://mydomain.com:80'
      )
    })

    it('should return the origin without a port if it does not exist', () => {
      const url = 'https://mydomain.com/svn/Repos/'
      expect(linksHelpers.getOriginFromUrl(url)).toEqual(
        'https://mydomain.com'
      )
    })
  })
})
