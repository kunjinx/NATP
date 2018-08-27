const util = require('util')

const _ = require('lodash')
const Promise = require('bluebird')
const uuid = require('uuid')

const dbapi = require('../../../db/api')
const logger = require('../../../util/logger')
const datautil = require('../../../util/datautil')
const deviceutil = require('../../../util/deviceutil')
const wire = require('../../../wire/index')
const wireutil = require('../../../wire/util')
const wirerouter = require('../../../wire/router')

const log = logger.createLogger('api:controllers:user')

module.exports = {
    getUser: getUser
    , getUserDevices: getUserDevices
    , addUserDevice: addUserDevice
    , getUserDeviceBySerial: getUserDeviceBySerial
    , deleteUserDeviceBySerial: deleteUserDeviceBySerial
    , remoteConnectUserDeviceBySerial: remoteConnectUserDeviceBySerial
    , remoteDisconnectUserDeviceBySerial: remoteDisconnectUserDeviceBySerial
    , getUserAccessTokens: getUserAccessTokens
}

function getUser(req, res) {
    res.json({
        success: true
        , user: req.user
    })
}

function getUserDevices(req, res) {
    let fields = req.swagger.params.fields.value

    dbapi.loadUserDevices(req.user.email)
        .then(function (cursor) {
            return Promise.promisify(cursor.toArray, cursor)()
                .then(function (list) {
                    let deviceList = []

                    list.forEach(function (device) {
                        datautil.normalize(device, req.user)
                        let responseDevice = device
                        if (fields) {
                            responseDevice = _.pick(device, fields.split(','))
                        }
                        deviceList.push(responseDevice)
                    })

                    res.json({
                        success: true
                        , devices: deviceList
                    })
                })
        })
        .catch(function (err) {
            log.error('Failed to load device list: ', err.stack)
            res.status(500).json({
                success: false
            })
        })
}

function getUserDeviceBySerial(req, res) {
    let serial = req.swagger.params.serial.value
    let fields = req.swagger.params.fields.value

    dbapi.loadDevice(serial)
        .then(function (device) {
            if (!device) {
                return res.status(404).json({
                    success: false
                    , description: 'Device not found'
                })
            }

            datautil.normalize(device, req.user)
            if (!deviceutil.isOwnedByUser(device, req.user)) {
                return res.status(403).json({
                    success: false
                    , description: 'Device is not owned by you'
                })
            }

            let responseDevice = device
            if (fields) {
                responseDevice = _.pick(device, fields.split(','))
            }

            res.json({
                success: true
                , device: responseDevice
            })
        })
        .catch(function (err) {
            log.error('Failed to load device "%s": ', req.params.serial, err.stack)
            res.status(500).json({
                success: false
            })
        })
}

function addUserDevice(req, res) {
    let serial = req.body.serial
    let timeout = req.body.timeout || null

    dbapi.loadDevice(serial)
        .then(function (device) {
            if (!device) {
                return res.status(404).json({
                    success: false
                    , description: 'Device not found'
                })
            }

            datautil.normalize(device, req.user)
            if (!deviceutil.isAddable(device, req.user)) {
                return res.status(403).json({
                    success: false
                    , description: 'Device is being used or not available'
                })
            }

            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let responseTimer = setTimeout(function () {
                req.options.channelRouter.removeListener(wireutil.global, messageListener)
                return res.status(504).json({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000)

            let messageListener = wirerouter()
                .on(wire.JoinGroupMessage, function (channel, message) {
                    if (message.serial === serial && message.owner.email === req.user.email) {
                        clearTimeout(responseTimer)
                        req.options.channelRouter.removeListener(wireutil.global, messageListener)

                        return res.json({
                            success: true
                            , description: 'Device successfully added'
                        })
                    }
                })
                .handler()

            req.options.channelRouter.on(wireutil.global, messageListener)
            let usage = 'automation'

            req.options.push.send([
                device.channel
                , wireutil.envelope(
                    new wire.GroupMessage(
                        new wire.OwnerMessage(
                            req.user.email
                            , req.user.name
                            , req.user.group
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
        })
        .catch(function (err) {
            log.error('Failed to load device "%s": ', req.params.serial, err.stack)
            res.status(500).json({
                success: false
            })
        })
}

function deleteUserDeviceBySerial(req, res) {
    let serial = req.swagger.params.serial.value

    dbapi.loadDevice(serial)
        .then(function (device) {
            if (!device) {
                return res.status(404).json({
                    success: false
                    , description: 'Device not found'
                })
            }

            datautil.normalize(device, req.user)
            if (!deviceutil.isOwnedByUser(device, req.user)) {
                return res.status(403).json({
                    success: false
                    , description: 'You cannot release this device. Not owned by you'
                })
            }

            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let responseTimer = setTimeout(function () {
                req.options.channelRouter.removeListener(wireutil.global, messageListener)
                return res.status(504).json({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000)

            let messageListener = wirerouter()
                .on(wire.LeaveGroupMessage, function (channel, message) {
                    if (message.serial === serial && message.owner.email === req.user.email) {
                        clearTimeout(responseTimer)
                        req.options.channelRouter.removeListener(wireutil.global, messageListener)

                        return res.json({
                            success: true
                            , description: 'Device successfully removed'
                        })
                    }
                })
                .handler()

            req.options.channelRouter.on(wireutil.global, messageListener)

            req.options.push.send([
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
        })
        .catch(function (err) {
            log.error('Failed to load device "%s": ', req.params.serial, err.stack)
            res.status(500).json({
                success: false
            })
        })
}

function remoteConnectUserDeviceBySerial(req, res) {
    let serial = req.swagger.params.serial.value

    dbapi.loadDevice(serial)
        .then(function (device) {
            if (!device) {
                return res.status(404).json({
                    success: false
                    , description: 'Device not found'
                })
            }

            datautil.normalize(device, req.user)
            if (!deviceutil.isOwnedByUser(device, req.user)) {
                return res.status(403).json({
                    success: false
                    , description: 'Device is not owned by you or is not available'
                })
            }

            let responseChannel = 'txn_' + uuid.v4()
            req.options.sub.subscribe(responseChannel)

            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let timer = setTimeout(function () {
                req.options.channelRouter.removeListener(responseChannel, messageListener)
                req.options.sub.unsubscribe(responseChannel)
                return res.status(504).json({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000)

            let messageListener = wirerouter()
                .on(wire.ConnectStartedMessage, function (channel, message) {
                    if (message.serial === serial) {
                        clearTimeout(timer)
                        req.options.sub.unsubscribe(responseChannel)
                        req.options.channelRouter.removeListener(responseChannel, messageListener)

                        return res.json({
                            success: true
                            , remoteConnectUrl: message.url
                        })
                    }
                })
                .handler()

            req.options.channelRouter.on(responseChannel, messageListener)

            req.options.push.send([
                device.channel
                , wireutil.transaction(
                    responseChannel
                    , new wire.ConnectStartMessage()
                )
            ])
        })
        .catch(function (err) {
            log.error('Failed to load device "%s": ', req.params.serial, err.stack)
            res.status(500).json({
                success: false
            })
        })
}

function remoteDisconnectUserDeviceBySerial(req, res) {
    let serial = req.swagger.params.serial.value

    dbapi.loadDevice(serial)
        .then(function (device) {
            if (!device) {
                return res.status(404).json({
                    success: false
                    , description: 'Device not found'
                })
            }

            datautil.normalize(device, req.user)
            if (!deviceutil.isOwnedByUser(device, req.user)) {
                return res.status(403).json({
                    success: false
                    , description: 'Device is not owned by you or is not available'
                })
            }

            let responseChannel = 'txn_' + uuid.v4()
            req.options.sub.subscribe(responseChannel)

            // Timer will be called if no JoinGroupMessage is received till 5 seconds
            let timer = setTimeout(function () {
                req.options.channelRouter.removeListener(responseChannel, messageListener)
                req.options.sub.unsubscribe(responseChannel)
                return res.status(504).json({
                    success: false
                    , description: 'Device is not responding'
                })
            }, 5000)

            let messageListener = wirerouter()
                .on(wire.ConnectStoppedMessage, function (channel, message) {
                    if (message.serial === serial) {
                        clearTimeout(timer)
                        req.options.sub.unsubscribe(responseChannel)
                        req.options.channelRouter.removeListener(responseChannel, messageListener)

                        return res.json({
                            success: true
                            , description: 'Device remote disconnected successfully'
                        })
                    }
                })
                .handler()

            req.options.channelRouter.on(responseChannel, messageListener)

            req.options.push.send([
                device.channel
                , wireutil.transaction(
                    responseChannel
                    , new wire.ConnectStopMessage()
                )
            ])
        })
        .catch(function (err) {
            log.error('Failed to load device "%s": ', req.params.serial, err.stack)
            res.status(500).json({
                success: false
            })
        })
}

function getUserAccessTokens(req, res) {
    dbapi.loadAccessTokens(req.user.email)
        .then(function (cursor) {
            return Promise.promisify(cursor.toArray, cursor)()
                .then(function (list) {
                    let titles = []
                    list.forEach(function (token) {
                        titles.push(token.title)
                    })
                    res.json({
                        success: true
                        , titles: titles
                    })
                })
        })
        .catch(function (err) {
            log.error('Failed to load tokens: ', err.stack)
            res.status(500).json({
                success: false
            })
        })
}
