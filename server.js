const net = require('net'),
    server = new net.createServer(),
    settings = require('./settings')(),
    NetworkTools = require('./network-tools')(server)

server.listen(settings.port, settings.host)
    .on('listening', () => {
        console.log(`Network tool server listening on [${settings.host}]:${settings.port}`)
    })
    .on('close', () => {
        // Removed console log
    })
    .on('error', err => {
        // Removed console error
    })
    .on('connection', socket => {
        var tool = NetworkTools(socket)
        socket.on('data', buf => {
            tool.handle(buf)
        })
            .on('end', () => {
                // Removed console log
            })
            .on('close', hadError => {
                // Removed console log
            })
            .on('error', err => {
                // Removed console error
            })
            .on('timeout', () => {
                // Removed console log
            })
    })
