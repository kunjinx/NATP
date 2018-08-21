var yargs = require('yargs')
var Promise = require('bluebird')

Promise.longStackTraces()

var _argv = yargs.usage('Usage: $0 <command> [options]')
    .strict()
    .command(require('./api/index'))
    .command(require('./app/index'))
    .command(require('./doctor/index'))
    .command(require('./local/index'))
    .command(require('./processor/index'))
    .command(require('./triproxy/index'))
    .command(require('./websocket/index'))
    .demandCommand(1, 'Must provide a valid command.')
    .help('h', 'Show help.')
    .alias('h', 'help')
    .version('V', 'Show version.', function () {
        return require('../package').version
    })
    .alias('V', 'version')
    .argv
