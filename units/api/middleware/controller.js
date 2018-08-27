const fs = require('fs');
const logger = require('../../../util/logger');
const log = logger.createLogger('api');

// add url-route in /controllers:

function addMapping(router, mapping) {
    for (let url in mapping) {
        if (url.startsWith('GET ')) {
            let path = url.substring(4);
            router.get(path, mapping[url]);
            log.info(`register URL mapping: GET ${path}`);
        } else if (url.startsWith('POST ')) {
            let path = url.substring(5);
            router.post(path, mapping[url]);
            log.info(`register URL mapping: POST ${path}`);
        } else if (url.startsWith('PUT ')) {
            let path = url.substring(4);
            router.put(path, mapping[url]);
            log.info(`register URL mapping: PUT ${path}`);
        } else if (url.startsWith('DELETE ')) {
            let path = url.substring(7);
            router.del(path, mapping[url]);
            log.info(`register URL mapping: DELETE ${path}`);
        } else {
            log.info(`invalid URL: ${url}`);
        }
    }
}

function addControllers(router, dir) {
    fs.readdirSync(__dirname + '/' + dir).filter((f) => {
        return f.endsWith('.js');
}).forEach((f) => {
        log.info(`process controller: ${f}...`);
    let mapping = require(__dirname + '/' + dir + '/' + f);
    addMapping(router, mapping);
});
}

module.exports = function (dir) {

    let
        controllers_dir = dir || '../controllers',
        router = require('koa-router')();
    addControllers(router, controllers_dir);
    return router.routes();
};