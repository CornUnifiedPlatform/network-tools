const net = require('net'),
      dns = require('dns'),
      { assert } = require('console'),
      uuid = require('uuid'),

      utils = require('./utils'),
      definitions = require('./definitions')(),
      settings = require('./settings')()

function NetworkTools(socket) {
  return {
    _socket: socket,

    _session: {
      id: uuid.v1(),
      buffer: Buffer.alloc(0),
      offset: 0,
      state: definitions.PHASES.INIT_HANDSHAKE
    },

    parseInitialHandshake() {
      let buf = this._session.buffer
      let offset = this._session.offset

      var checkNull = offset => {
        return typeof buf[offset] === undefined
      }

      if(checkNull(offset)) {
        return false
      }
      let version = buf[offset++]
      assert(version == definitions.PROTOCOL_VERSION, 
        `Session ${this._session.id} version mismatch, got [${version}]`)
      if(version != definitions.PROTOCOL_VERSION) {
        this._socket.end()
        return false
      }

      if(checkNull(offset)) {
        return false
      }
      let methodLen = buf[offset++]
      assert(methodLen >= 1 && methodLen <= 255, 
        `Session ${this._session.id} invalid method length [${methodLen}]`)

      if(checkNull(offset + methodLen - 1)) {
        return false
      }
      let methods = []
      for(let i = 0; i < methodLen; i++) {
        let method = definitions.VERIFICATION.get(buf[offset++])
        if (!!method) {
          methods.push(method)
        }
      }

      console.log(`Session ${this._session.id} version: ${version}`)
      console.log(`Session ${this._session.id} available methods: `, methods)

      this._session.offset = offset

      return methods
    },

    selectVerification(methods) {
      let method = definitions.VERIFICATION.UNAVAILABLE
      for(let i = 0; i < methods.length; i++) {
        if (methods[i] == settings.verification) {
          method = settings.verification
        }
      }

      console.log(`Selected verification method [${method}]`)

      this._session.method = method

      return method
    },

    replyVerification(method) {
      this._socket.write(Buffer.from([definitions.PROTOCOL_VERSION, method[0]]))
    },

    parseCredentials() {
      let buf = this._session.buffer
      let offset = this._session.offset

      var req = {}

      var checkNull = offset => {
        return typeof buf[offset] === undefined
      }

      if(checkNull(offset)) {
        return false
      }
      let version = buf[offset++]
      assert(version == definitions.AUTH_VERSION,
        `Session ${this._session.id} auth version mismatch, got [${version}]`)
      if(version != definitions.AUTH_VERSION) {
        this._socket.end()
        return false
      }

      if(checkNull(offset)) {
        return false
      }
      let uLen = buf[offset++]
      assert(uLen >= 1 && uLen <= 255, 
        `Session ${this._session.id} invalid username length [${uLen}]`)
      if(uLen >= 1 && uLen <= 255) {
        if(checkNull(offset + uLen - 1)) {
          return false
        }
        req.username = buf.slice(offset, offset + uLen).toString('utf8')
        offset += uLen
      } else {
        this._socket.end()
        return false
      }

      if(checkNull(offset)) {
        return false
      }
      let pLen = buf[offset++]
      assert(pLen >= 1 && pLen <= 255,
        `Session ${this._session.id} invalid password length [${pLen}]`)
      if(pLen >= 1 && pLen <= 255) {
        if(checkNull(offset + pLen - 1)) {
          return false
        }
        req.passwd = buf.slice(offset, offset + pLen).toString('utf8')
        offset += pLen
      } else {
        this._socket.end()
        return false
      }

      this._session.offset = offset

      return req
    },

    replyAuth(succeeded) {
      let reply = [
        definitions.AUTH_VERSION,
        succeeded ? definitions.AUTH_RESULTS.SUCCESS : definitions.AUTH_RESULTS.FAILURE
      ]
      if (succeeded) {
        this._socket.write(Buffer.from(reply))
      } else {
        this._socket.end(Buffer.from(reply))
      }
    },

    parseRequest() {
      let buf = this._session.buffer
      let offset = this._session.offset

      let req = {}

      var checkNull = offset => {
        return typeof buf[offset] === undefined
      }

      if(checkNull(offset)) {
        return false
      }
      let version = buf[offset++]
      assert(version == definitions.PROTOCOL_VERSION, 
        `Session ${this._session.id} version mismatch, got [${version}]`)
      if(version != definitions.PROTOCOL_VERSION) {
        this._socket.end()
        return false
      }

      if(checkNull(offset)) {
        return false
      }
      req.cmd = definitions.CONNECTION_TYPES.get(buf[offset++])
      if(!req.cmd || req.cmd != definitions.CONNECTION_TYPES.DIRECT) {
        this._socket.end()
        return false
      }

      if(checkNull(offset)) {
        return false
      }
      req.rsv = buf[offset++]
      assert(req.rsv == definitions.RESERVED, 
        `Session ${this._session.id} invalid reserved value`)

      if(checkNull(offset)) {
        return false
      }
      req.atyp = definitions.ADDRESS_TYPES.get(buf[offset++])
      if(!req.atyp) {
        this._socket.end()
        return false
      } else if(req.atyp == definitions.ADDRESS_TYPES.IPV4) {
        let ipLen = 4
        if(checkNull(offset + ipLen - 1)) {
          return false
        }
        req.ip = `${buf[offset++]}.${buf[offset++]}.${buf[offset++]}.${buf[offset++]}`
      } else if(req.atyp == definitions.ADDRESS_TYPES.DOMAIN) {
        if(checkNull(offset)) {
          return false
        }
        let domainLen = buf[offset++]
        if(checkNull(offset + domainLen - 1)) {
          return false
        }
        req.domain = buf.slice(offset, offset + domainLen).toString('utf8')
        offset += domainLen
      } else {
        this._socket.end()
        return false
      }

      let portLen = 2
      if(checkNull(offset + portLen - 1)) {
        return false
      }
      req.port = buf.readUInt16BE(offset)
      offset += portLen

      console.log(`Session ${this._session.id} request parsed`, req)

      this._session.offset = offset

      return req
    },

    establishConnection(req) {
      let targetHost = req.domain || req.ip
      dns.lookup(targetHost, { family: 4 }, (err, ip) => {
        if (err || !ip) {
          let reply = [
            definitions.PROTOCOL_VERSION,
            definitions.RESPONSES.HOST_ERROR[0],
            definitions.RESERVED,
            definitions.ADDRESS_TYPES.IPV4[0]
          ]
          .concat(utils.ipbytes('127.0.0.1'))
          .concat([0x00, 0x00])
          this._socket.end(Buffer.from(reply))
        } else {
          const targetSocket = net.createConnection({
            port: req.port,
            host: ip
          })

          targetSocket.on('connect', () => {
            let bytes = [
              definitions.PROTOCOL_VERSION,
              definitions.RESPONSES.SUCCESS[0],
              definitions.RESERVED,
              definitions.ADDRESS_TYPES.IPV4[0]
            ]
            .concat(utils.ipbytes(targetSocket.localAddress || '127.0.0.1'))
            .concat([0x00, 0x00])

            let reply = Buffer.from(bytes)
            reply.writeUInt16BE(targetSocket.localPort, reply.length - 2)

            this._socket.write(reply)
            this._socket.pipe(targetSocket).pipe(this._socket)
          })
          .on('error', err => {
            console.error(`Session ${this._session.id} -> target error:`, err)
          })
          .on('end', () => {
            console.log(`Session ${this._session.id} -> target end`)
          })
          .on('close', () => {
            console.log(`Session ${this._session.id} -> target close`)
          })

          this._session.targetSocket = targetSocket
        }
      })
    },

    handle(buf) {
      if(this._session.state < definitions.PHASES.DATA_TRANSFER) {
        this._session.buffer = Buffer.concat([this._session.buffer, buf])

        const moveToNextPhase = (nextState) => {
          this._session.buffer = this._session.buffer.slice(this._session.offset)
          this._session.offset = 0
          this._session.state = nextState
        }

        switch(this._session.state) {
          case definitions.PHASES.INIT_HANDSHAKE:
            let methods = this.parseInitialHandshake()
            if(!!methods) {
              let method = this.selectVerification(methods)
              this.replyVerification(method)
              switch(method) {
                case definitions.VERIFICATION.CUSTOM_2:
                  moveToNextPhase(definitions.PHASES.VERIFY_IDENTITY)
                  break
                case definitions.VERIFICATION.NONE:
                  moveToNextPhase(definitions.PHASES.ESTABLISH_CONNECTION)
                  break
                case definitions.VERIFICATION.UNAVAILABLE:
                  this._socket.end()
                  break
                default:
                  this._socket.end()
              }
            }
            break
          case definitions.PHASES.VERIFY_IDENTITY:
            let userinfo = this.parseCredentials()
            if(!!userinfo) {
              let succeeded = (
                userinfo.username === settings.username &&
                userinfo.passwd === settings.passwd
              )
              moveToNextPhase(
                succeeded ? definitions.PHASES.ESTABLISH_CONNECTION : definitions.PHASES.VERIFY_IDENTITY
              )
              this.replyAuth(succeeded)
            }
            break
          case definitions.PHASES.ESTABLISH_CONNECTION:
            let req = this.parseRequest()
            if(!!req) {
              this.establishConnection(req)
              moveToNextPhase(definitions.PHASES.DATA_TRANSFER)
            }
            break
          case definitions.PHASES.DATA_TRANSFER:
          default:
            console.log(`Current state [${this._session.state}]`, this._session)
        }
      }
    }
  }
}

module.exports = server => {
  return NetworkTools
}
