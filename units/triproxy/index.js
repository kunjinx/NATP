const logger = require('../../util/logger')
const lifecycle = require('../../util/lifecycle')
const zmqutil = require('../../util/zmqutil')

module.exports = function (options) {
    const log = logger.createLogger('triproxy')

    if (options.name) {
        logger.setGlobalIdentifier(options.name)
    }

    function proxy(to) {
        return function () {
            to.send([].slice.call(arguments))
        }
    }

    // App/device output
    const pub = zmqutil.socket('pub')
    pub.bindSync(options.endpoints.pub)
    log.info('PUB socket bound on', options.endpoints.pub)

    // Coordinator input/output
    const dealer = zmqutil.socket('dealer')
    dealer.bindSync(options.endpoints.dealer)
    dealer.on('message', proxy(pub))
    log.info('DEALER socket bound on', options.endpoints.dealer)

    // App/device input
    const pull = zmqutil.socket('pull')
    pull.bindSync(options.endpoints.pull)
    pull.on('message', proxy(dealer))
    log.info('PULL socket bound on', options.endpoints.pull)

    lifecycle.observe(function () {
        [pub, dealer, pull].forEach(function (sock) {
            try {
                sock.close()
            }
            catch (err) {
                // No-op
            }
        })
    })
};
