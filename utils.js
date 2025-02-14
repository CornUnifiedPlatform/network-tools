module.exports = {
  ipbytes(ip) {
    return ip.split('.').map(n => parseInt(n))
  }
}
