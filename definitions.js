const PROTOCOL_VERSION = 0x05,
      PHASES = {
        INIT_HANDSHAKE: 0x00,
        VERIFY_IDENTITY: 0x01,
        ESTABLISH_CONNECTION: 0x02,
        DATA_TRANSFER: 0x03
      },

      VERIFICATION = {
        NONE: [0x00, 'none'], 
        CUSTOM_1: [0x01, 'custom_1'],
        CUSTOM_2: [0x02, 'custom_2'],
        UNAVAILABLE: [0xFF, 'unavailable'],

        get(type) {
          switch(type) {
            case this.NONE[0]:
              return this.NONE
            case this.CUSTOM_1[0]:
              return this.CUSTOM_1
            case this.CUSTOM_2[0]:
              return this.CUSTOM_2
          }
          console.error(`Verification type [${type}] not supported`)
          return false
        }
      },

      CONNECTION_TYPES = {
        DIRECT: [0x01, 'direct'],
        RELAY: [0x02, 'relay'], 
        DATAGRAM: [0x03, 'datagram'],

        get(type) {
          switch(type) {
            case this.DIRECT[0]:
              return this.DIRECT
            case this.RELAY[0]:
              return this.RELAY
            case this.DATAGRAM[0]:
              return this.DATAGRAM
          }
          console.error(`Connection type [${type}] not supported`) 
          return false
        }
      },

      RESERVED = 0x00,

      ADDRESS_TYPES = {
        IPV4: [0x01, 'ipv4'],
        DOMAIN: [0x03, 'domain'],
        IPV6: [0x04, 'ipv6'],

        get(type) {
          switch(type) {
            case this.IPV4[0]:
              return this.IPV4
            case this.DOMAIN[0]:
              return this.DOMAIN
            case this.IPV6[0]:
              return this.IPV6
          }
          console.error(`Address type [${type}] not supported`)
          return false
        }
      },

      RESPONSES = {
        SUCCESS: [0x00, 'success'],
        SERVER_ERROR: [0x01, 'server error'],
        DENIED: [0x02, 'connection denied'],
        NETWORK_ERROR: [0x03, 'network error'],
        HOST_ERROR: [0x04, 'host error'],
        REFUSED: [0x05, 'connection refused'],
        EXPIRED: [0x06, 'expired'],
        UNSUPPORTED_COMMAND: [0x07, 'command not supported'],
        UNSUPPORTED_ADDRESS: [0x08, 'address type not supported']
      },

      AUTH_VERSION = 0x01,
      
      AUTH_RESULTS = {
        SUCCESS: 0x00,
        FAILURE: 0X01
      }

module.exports = () => {
  return {
    PROTOCOL_VERSION,
    PHASES,
    VERIFICATION,
    CONNECTION_TYPES,
    RESERVED,
    ADDRESS_TYPES,
    RESPONSES,
    AUTH_VERSION,
    AUTH_RESULTS
  }
}
