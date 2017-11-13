var dgram = require('dgram'),
    dns = require('dns'),
    net = require('net'),
    Buffer = require('buffer').Buffer,
    chalk = require('chalk'),
    vow = require('vow');

const BROADCAST = '255.255.255.255';

module.exports = function(mac, params) {

    var magicPacket = createMagicPacket(mac),
        socket;

    getIP(params).then(function(ip) {

        socket = dgram.createSocket(net.isIPv6(ip) ? 'udp6' : 'udp4');

        socket.once('listening', function() {
            socket.setBroadcast(ip === BROADCAST)
        });

        if (ip === BROADCAST) {
            console.log('Broadcasting magic packet to %s.', chalk.blue(mac));
        } else {
            console.log('Sending magic packet to %s with IP=%s.', chalk.blue(mac), chalk.magenta(ip));
        }

        socket.send(magicPacket, 0, magicPacket.length, params.port, ip, function(err) {
            if (err) {
                console.log(chalk.red('Sorry ;('));
                console.error(err);
            } else {
                console.log('%s. Your computer is awakening right now...', chalk.green('All\'s fine'));
            }
            socket.close();
        });

    });

}

const MAC_BYTES = 6;
const MAC_REPETITIONS = 16;

/**
 * Magic packet is:
 * FF (repeat 6)
 * MAC Address (repat 16)
 */
function createMagicPacket(mac) {

    var macBuffer = new Buffer(MAC_BYTES);

    mac.split(':').forEach(function(value, i) {
        macBuffer[i] = parseInt(value, 16);
    });

    var buffer = new Buffer(MAC_BYTES + MAC_REPETITIONS * MAC_BYTES);

    // start the magic packet from 6 bytes of FF
    for (var i = 0; i < MAC_BYTES; i++) {
        buffer[i] = 0xFF;
    }

    // copy mac address 16 times
    for (var i = 0; i < MAC_REPETITIONS; i++) {
        macBuffer.copy(buffer, (i + 1) * MAC_BYTES, 0, macBuffer.length);
    }

    return buffer;

}

function getIP(params) {

    var defer = vow.defer();

    if (!params.host) {
        defer.resolve(params.ip);
    } else {
        dns.resolve(params.host, function(err, addresses) {
            if (err) {
                console.error(err);
                defer.resolve(BROADCAST)
            } else {
                defer.resolve(addresses[0]);
            }
        });
    }

    return defer.promise();

}

module.exports.isMACValid = function(mac) {
    if (mac.length == 2 * MAC_BYTES + (MAC_BYTES - 1)) {
        mac = mac.replace(new RegExp(mac[2], 'g'), '');
    }

    return !(mac.length != 2 * MAC_BYTES || mac.match(/[^a-fA-F0-9]/));
}

module.exports.relay = function(mac, params) {

        getIP(params).then(function(ip) {
            
            var magicPacket = createMagicPacket(mac);
            listensocket = dgram.createSocket('udp4');
            
            listensocket.on('error', (err) => {
              console.log(`server error:\n${err.stack}`);
              listensocket.close();
            });
            
            listensocket.on('message', (msg, rinfo) => {
            
                if (msg.equals(magicPacket)) {
                    var broadcastsocket = dgram.createSocket(net.isIPv6(ip) ? 'udp6' : 'udp4');

                    broadcastsocket.once('listening', function() {
                        broadcastsocket.setBroadcast(true);
                    });

                    console.log('Broadcasting magic packet to %s.', chalk.blue(mac));

                    broadcastsocket.send(magicPacket, 0, magicPacket.length, params.port, BROADCAST, function(err) {
                        if (err) {
                            console.error(chalk.red('Sorry ;('));
                            console.error(err);
                        } else {
                            console.log('%s. Your computer is awakening right now...', chalk.green('All\'s fine'));
                        }
                        broadcastsocket.close();
                    });
                }
            });
            
            listensocket.on('listening', () => {
              const address = listensocket.address();
              console.log(`server listening ${address.address}:${address.port}`);
            });
            
            listensocket.bind(params.relayport);

        });
    
    }
