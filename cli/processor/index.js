module.exports.command = 'processor [name]'

module.exports.describe = 'Start a processor unit.'

module.exports.builder = function (yargs) {
    var os = require('os')

    return yargs
        .env('NATP_PROCESSOR')
        .strict()
        .option('connect-dev-dealer', {
            alias: 'd'
            , describe: 'Device-side ZeroMQ DEALER endpoint to connect to.'
            , array: true
            , demand: true
        })
        .option('name', {
            describe: 'An easily identifiable name for log output.'
            , type: 'string'
            , default: os.hostname()
        })
        .option('bind-pub', {
            alias: 'u'
            , describe: 'The address to bind the ZeroMQ PUB endpoint to.'
            , type: 'string'
            , default: 'tcp://*:7111'
        })
        .option('bind-pull', {
            alias: 'p'
            , describe: 'The address to bind the ZeroMQ PULL endpoint to.'
            , type: 'string'
            , default: 'tcp://*:7113'
        })
        .epilog('Each option can be be overwritten with an environment variable ' +
            'by converting the option to uppercase, replacing dashes with ' +
            'underscores and prefixing it with `STF_PROCESSOR_` (e.g. ' +
            '`STF_PROCESSOR_CONNECT_APP_DEALER`).')
}

module.exports.handler = function (argv) {
    return require('../../units/processor')({
        name: argv.name
        , endpoints: {
            devDealer: argv.connectDevDealer
            , pub: argv.bindPub
            , pull: argv.bindPull
        }
    })
}
