const definitions = require('./definitions')(),
      settings = {
        port: 20000,
        host: '::1',
        verification: definitions.VERIFICATION.NONE
      }

module.exports = () => {
  return settings
}
