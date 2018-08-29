const events = require('events');

const koa = require('koa');
const bodypraser = require('koa-bodyparser');
const Promise = require('bluebird');
const _ = require('lodash');

const logger = require('../../util/logger');
const zmqutil = require('../../util/zmqutil');
const srv = require('../../util/srv');
const lifecycle = require('../../util/lifecycle');
const wireutil = require('../../wire/util');
const rest = require('./middleware/rest');
const controller = require('./middleware/controller');
const db = require('../../db/setup');

module.exports = function (options) {
    let log = logger.createLogger('api');
    let app = new koa();
    //db().initialTables();
    let channelRouter = new events.EventEmitter();

    let push = zmqutil.socket('push');
    Promise.map(options.endpoints.push, function (endpoint) {
        return srv.resolve(endpoint).then(function (records) {
            return srv.attempt(records, function (record) {
                log.info('Sending output to "%s"', record.url);
                push.connect(record.url);
                return Promise.resolve(true)
            })
        })
    })
        .catch(function (err) {
            log.fatal('Unable to connect to push endpoint', err);
            lifecycle.fatal()
        });

    // Input
    let sub = zmqutil.socket('sub');
    Promise.map(options.endpoints.sub, function (endpoint) {
        return srv.resolve(endpoint).then(function (records) {
            return srv.attempt(records, function (record) {
                log.info('Receiving input from "%s"', record.url);
                sub.connect(record.url);
                return Promise.resolve(true)
            })
        })
    })
        .catch(function (err) {
            log.fatal('Unable to connect to sub endpoint', err);
            lifecycle.fatal()
        })

    // Establish always-on channels
    ;
    [wireutil.global].forEach(function (channel) {
        log.info('Subscribing to permanent channel "%s"', channel);
        sub.subscribe(channel)
    });

    sub.on('message', function (channel, data) {
        channelRouter.emit(channel.toString(), channel, data)
    });

    // Adding options in request, so that swagger controller
    // can use it.
    app.use(async(ctx, next) => {
        let reqOptions = _.merge(options, {
            push: push
            , sub: sub
            , channelRouter: channelRouter
        });

        ctx.options = reqOptions;
        await next()
    });

    app.use(bodypraser());

    app.use(async(ctx, next) => {
        ctx.user = {
            name: 'xu'
            , email: '1109369177@qq.com'
        };
        await next()
    });


    app.use(rest.restify());

    app.use(controller());

    lifecycle.observe(function () {
        [push, sub].forEach(function (sock) {
            try {
                sock.close()
            }
            catch (err) {
                // No-op
            }
        })
    });

    app.listen(options.port);
    log.info('Listening on port %d', options.port)
};
