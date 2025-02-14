const net = require('net'),
      server = new net.createServer(),
      settings = require('./settings')(),
      NetworkTools = require('./network-tools')(server)

server.listen(settings.port, settings.host)
      .on('listening', () => {
        console.log(`Network tool server listening on [${settings.host}]:${settings.port}`)
      })
      .on('close', () => {
        console.log('Network tool server closed')
      })
      .on('error', err => {
        console.error('Network tool server error:', err)
      })
      .on('connection', socket => {
        var tool = NetworkTools(socket)
        socket.on('data', buf => {
          tool.handle(buf)
        })
        .on('end', () => {
          console.log(`Session ${tool._session.id} end`)
        })
        .on('close', hadError => {
          console.log(`Session ${tool._session.id} closed with error ${hadError}`)
        })
        .on('error', err => {
          console.error(`Session ${tool._session.id} error:`, err)
        })
        .on('timeout', () => {
          console.log(`Session ${tool._session.id} timeout`)
        })
      })
