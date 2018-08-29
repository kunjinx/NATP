const util = require('util');
const uuid = require('uuid');

const dbapi = require('../../../db/index');
const logger = require('../../../util/logger');
const datautil = require('../../../util/datautil');
const deviceutil = require('../../../util/deviceutil');
const wire = require('../../../wire/index');
const wireutil = require('../../../wire/util');
const wirerouter = require('../../../wire/router');

const log = logger.createLogger('api:controllers:user');

module.exports = {
    'GET /api/user': getUser()
    , 'GET /api/user/devices': getUserDevices()
    , 'POST /api/user/devices': addUserDevice()
    , 'GET /api/user/devices/:serial': getUserDeviceBySerial()
    , 'DELETE /api/user/devices/:serial': deleteUserDeviceBySerial()
    , 'POST /api/user/devices/:serial/remoteConnect': remoteConnectUserDeviceBySerial()
    , 'DELETE /api/user/devices/:serial/remoteConnect': remoteDisconnectUserDeviceBySerial()
    //, 'GET /api/user/accessTokenAuth': getUserAccessTokens()
};

function getUser() {
    return async(ctx, next) => {
        log.info(ctx.user);
        ctx.rest({
            success: true
            , user: ctx.user
        })
    }
}

function getUserDevices() {
    return async(ctx, next) => {
        try {
            let list = await dbapi.loadUserDevices(ctx.user.email);
            let deviceList = [];
            list.forEach(function (device) {
                datautil.normalize(device, ctx.user);
                deviceList.push(device);
            });
            ctx.rest({
                success: true
                , devices: deviceList
            });
        } catch (err) {
            log.error('Failed to load device list: ', err.stack);
            ctx.response.status = 500;
            ctx.rest({
                success: false
            })
        }
    }
}

function getUserDeviceBySerial() {
    return async(ctx, next) => {
        let serial = ctx.params.serial;
        try {
            let device = await dbapi.loadDevice(serial);
            if (!device) {
                ctx.response.status = 404;
                return ctx.rest({
                    success: false
                    , description: 'Device not found'
                });
            }
            datautil.normalize(device, ctx.user);
            if (!deviceutil.isOwnedByUser(device, ctx.user)) {
                ctx.response.status = 403;
                return ctx.rest({
                    success: false
                    , description: 'Device is not owned by you'
                });
            }
            ctx.rest({
                success: true
                , device: device
            });
        } catch (err) {
            log.error('Failed to load device "%s": ', ctx.params.serial, err.stack);
            ctx.response.status = 500;
            ctx.rest({
                success: false
            })
        }
    }
}

function addUserDevice() {
    return async(ctx, next) => {
        try {
            let serial = ctx.request.body.serial;
            let timeout = ctx.request.body.timeout || null;
            let device = dbapi.loadDevice(serial);
            if (!device) {
                ctx.response.status = 404;
                return ctx.rest({
                    success: false
                    , description: 'Device not found'
                })
            }
            datautil.normalize(device, ctx.user);
            if (!deviceutil.isAddable(device, ctx.user)) {
                ctx.response.status = 403;
                return ctx.rest({
                    success: false
                    , description: 'Device is being used or not available'
                })
            }
            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let responseTimer = setTimeout(function () {
                ctx.options.channelRouter.removeListener(wireutil.global, messageListener);
                ctx.response.status = 504;
                return ctx.rest({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000);

            let messageListener = wirerouter()
                .on(wire.JoinGroupMessage, function (channel, message) {
                    if (message.serial === serial && message.owner.email === ctx.user.email) {
                        clearTimeout(responseTimer);
                        ctx.options.channelRouter.removeListener(wireutil.global, messageListener);

                        return ctx.rest({
                            success: true
                            , description: 'Device successfully added'
                        })
                    }
                })
                .handler();

            ctx.options.channelRouter.on(wireutil.global, messageListener);
            let usage = 'automation';

            ctx.options.push.send([
                device.channel
                , wireutil.envelope(
                    new wire.GroupMessage(
                        new wire.OwnerMessage(
                            ctx.user.email
                            , ctx.user.name
                            , ctx.user.group
                        )
                        , timeout
                        , wireutil.toDeviceRequirements({
                            serial: {
                                value: serial
                                , match: 'exact'
                            }
                        })
                        , usage
                    )
                )
            ])

        } catch (err) {
            log.error('Failed to load device "%s": ', ctx.request.body.serial, err.stack);
            ctx.response.status = 500;
            ctx.rest({
                success: false
            })
        }
    }
}

function deleteUserDeviceBySerial() {
    return async(ctx, next) => {
        try {
            let serial = ctx.params.serial;
            let device = dbapi.loadDevice(serial);
            if (!device) {
                ctx.response.status = 404;
                return ctx.rest({
                    success: false
                    , description: 'Device not found'
                })
            }
            datautil.normalize(device, ctx.user);
            if (!deviceutil.isOwnedByUser(device, ctx.user)) {
                ctx.response.status = 403;
                return ctx.rest({
                    success: false
                    , description: 'You cannot release this device. Not owned by you'
                })
            }
            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let responseTimer = setTimeout(function () {
                ctx.options.channelRouter.removeListener(wireutil.global, messageListener);
                ctx.response.status = 504;
                return ctx.rest({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000);

            let messageListener = wirerouter()
                .on(wire.LeaveGroupMessage, function (channel, message) {
                    if (message.serial === serial && message.owner.email === ctx.user.email) {
                        clearTimeout(responseTimer);
                        ctx.options.channelRouter.removeListener(wireutil.global, messageListener);

                        return ctx.rest({
                            success: true
                            , description: 'Device successfully removed'
                        })
                    }
                })
                .handler();

            ctx.options.channelRouter.on(wireutil.global, messageListener);

            ctx.options.push.send([
                device.channel
                , wireutil.envelope(
                    new wire.UngroupMessage(
                        wireutil.toDeviceRequirements({
                            serial: {
                                value: serial
                                , match: 'exact'
                            }
                        })
                    )
                )
            ])
        } catch (err) {
            log.error('Failed to load device "%s": ', ctx.params.serial, err.stack);
            ctx.response.status = 500;
            ctx.rest({
                success: false
            })
        }
    }
}

function remoteConnectUserDeviceBySerial() {
    return async(ctx, next) => {
        try {
            let serial = ctx.params.serial;
            let device = dbapi.loadDevice(serial);
            if (!device) {
                ctx.response.status = 404;
                return ctx.rest({
                    success: false
                    , description: 'Device not found'
                })
            }
            datautil.normalize(device, ctx.user);
            if (!deviceutil.isOwnedByUser(device, ctx.user)) {
                ctx.response.status = 403;
                return ctx.rest({
                    success: false
                    , description: 'Device is not owned by you or is not available'
                })
            }
            let responseChannel = 'txn_' + uuid.v4();
            ctx.options.sub.subscribe(responseChannel);

            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let timer = setTimeout(function () {
                ctx.options.channelRouter.removeListener(responseChannel, messageListener);
                ctx.options.sub.unsubscribe(responseChannel);
                ctx.response.status = 504;
                return ctx.rest({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000);

            let messageListener = wirerouter()
                .on(wire.ConnectStartedMessage, function (channel, message) {
                    if (message.serial === serial) {
                        clearTimeout(timer);
                        ctx.options.sub.unsubscribe(responseChannel);
                        ctx.options.channelRouter.removeListener(responseChannel, messageListener);

                        return ctx.rest({
                            success: true
                            , remoteConnectUrl: message.url
                        })
                    }
                })
                .handler();

            ctx.options.channelRouter.on(responseChannel, messageListener);

            ctx.options.push.send([
                device.channel
                , wireutil.transaction(
                    responseChannel
                    , new wire.ConnectStartMessage()
                )
            ])

        } catch (err) {
            log.error('Failed to load device "%s": ', ctx.params.serial, err.stack);
            ctx.response.status = 500;
            ctx.rest({
                success: false
            })
        }
    }
}

function remoteDisconnectUserDeviceBySerial() {
    return async(ctx, next) => {
        try {
            let serial = ctx.params.serial;
            let device = dbapi.loadDevice(serial);
            if (!device) {
                ctx.response.status = 404;
                return ctx.rest({
                    success: false
                    , description: 'Device not found'
                })
            }
            datautil.normalize(device, ctx.user);
            if (!deviceutil.isOwnedByUser(device, ctx.user)) {
                ctx.response.status = 403;
                return ctx.rest({
                    success: false
                    , description: 'You cannot release this device. Not owned by you'
                })
            }
            let responseChannel = 'txn_' + uuid.v4();
            ctx.options.sub.subscribe(responseChannel);

            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let timer = setTimeout(function () {
                ctx.options.channelRouter.removeListener(responseChannel, messageListener);
                ctx.options.sub.unsubscribe(responseChannel);
                ctx.response.status = 504;
                return ctx.rest({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000);

            let messageListener = wirerouter()
                .on(wire.ConnectStoppedMessage, function (channel, message) {
                    if (message.serial === serial) {
                        clearTimeout(timer)
                        ctx.options.sub.unsubscribe(responseChannel);
                        ctx.options.channelRouter.removeListener(responseChannel, messageListener);

                        return ctx.rest({
                            success: true
                            , description: 'Device remote disconnected successfully'
                        })
                    }
                })
                .handler();

            ctx.options.channelRouter.on(responseChannel, messageListener);

            ctx.options.push.send([
                device.channel
                , wireutil.transaction(
                    responseChannel
                    , new wire.ConnectStopMessage()
                )
            ])
        } catch (err) {
            log.error('Failed to load device "%s": ', ctx.params.serial, err.stack);
            ctx.response.status = 500;
            ctx.rest({
                success: false
            })
        }
    }
}

function getUserAccessTokens() {
    return async(ctx, next) => {
        try {
            let list = await dbapi.loadAccessTokens(ctx.user.email);
            let titles = [];
            list.forEach(function (token) {
                titles.push(token.title)
            });
            ctx.rest({
                success: true
                , titles: titles
            })
        } catch (err) {
            log.error('Failed to load tokens: ', err.stack);
            ctx.response.status = 500;
            ctx.rest({
                success: false
            })
        }
    }
}
