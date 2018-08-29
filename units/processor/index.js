const Promise = require('bluebird');

const logger = require('../../util/logger');
const wire = require('../../wire/index');
const wirerouter = require('../../wire/router');
const wireutil = require('../../wire/util');
const dbapi = require('../../db/index')
const lifecycle = require('../../util/lifecycle');
const srv = require('../../util/srv');
const zmqutil = require('../../util/zmqutil');

module.exports = function (options) {
    let log = logger.createLogger('processor');

    if (options.name) {
        logger.setGlobalIdentifier(options.name)
    }

    // App output
    let pub = zmqutil.socket('pub');
    pub.bindSync(options.endpoints.pub);
    log.info('PUB socket bound on', options.endpoints.pub);

    // Device side
    let devDealer = zmqutil.socket('dealer');


    Promise.map(options.endpoints.devDealer, function (endpoint) {
        return srv.resolve(endpoint).then(function (records) {
            return srv.attempt(records, function (record) {
                log.info('Device dealer connected to "%s"', record.url);
                devDealer.connect(record.url);
                return Promise.resolve(true)
            })
        })
    })
        .catch(function (err) {
            log.fatal('Unable to connect to dev dealer endpoint', err);
            lifecycle.fatal()
        });

    // App input
    let pull = zmqutil.socket('pull');
    pull.bindSync(options.endpoints.pull);
    pull.on('message', function (channel, data) {
        devDealer.send([channel, data])
    });
    log.info('PULL socket bound on', options.endpoints.pull);

    devDealer.on('message', wirerouter()
    // Initial device message
        .on(wire.DeviceIntroductionMessage, async(channel, message, data) => {
            try {
                await dbapi.saveDeviceInitialState(message.serial, message);
                devDealer.send([
                    message.provider.channel
                    , wireutil.envelope(new wire.DeviceRegisteredMessage(
                        message.serial
                    ))
                ]);
                pub.send([channel, data]);
            } catch (err) {
                log.error('saveDeviceInitialState failed:', message)
            }
            log.info('DeviceIntroductionMessage:', message.serial)
        })
        // Workerless messages
        .on(wire.DevicePresentMessage, async(channel, message, data) => {
            try {
                dbapi.setDevicePresent(message.serial);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDevicePresent failed:', message)
            }
            log.info('DevicePresentMessage', message.serial);
        })
        .on(wire.DeviceAbsentMessage, async(channel, message, data) => {
            try {
                dbapi.setDeviceAbsent(message.serial);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceAbsent failed:', message)
            }
            log.info('DeviceAbsentMessage', message.serial);
        })
        .on(wire.DeviceStatusMessage, async(channel, message, data) => {
            try {
                dbapi.saveDeviceStatus(message.serial, message.status);
                pub.send([channel, data])
            } catch (err) {
                log.error('saveDeviceStatus failed:', message)
            }
            log.info('DeviceStatusMessage', message.serial, message.status);

        })
        .on(wire.DeviceHeartbeatMessage, function (channel, message, data) {
            pub.send([channel, data])
        })
        // Worker initialized
        .on(wire.DeviceReadyMessage, async(channel, message, data) => {
            try {
                await dbapi.setDeviceReady(message.serial, message.channel);
                devDealer.send([
                    message.channel
                    , wireutil.envelope(new wire.ProbeMessage())
                ]);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceReady failed:', message)
            }
            log.info('DeviceReadyMessage', message.serial);
        })
        // Worker messages
        /*.on(wire.JoinGroupByAdbFingerprintMessage, function (channel, message) {
         dbapi.lookupUserByAdbFingerprint(message.fingerprint)
         .then(function (user) {
         if (user) {
         devDealer.send([
         channel
         , wireutil.envelope(new wire.AutoGroupMessage(
         new wire.OwnerMessage(
         user.email
         , user.name
         , user.group
         )
         , message.fingerprint
         ))
         ])
         }
         else if (message.currentGroup) {
         pub.send([
         message.currentGroup
         , wireutil.envelope(new wire.JoinGroupByAdbFingerprintMessage(
         message.serial
         , message.fingerprint
         , message.comment
         ))
         ])
         }
         })
         .catch(function (err) {
         log.error(
         'Unable to lookup user by ADB fingerprint "%s"'
         , message.fingerprint
         , err.stack
         )
         })
         })
         .on(wire.JoinGroupByVncAuthResponseMessage, function (channel, message) {
         dbapi.lookupUserByVncAuthResponse(message.response, message.serial)
         .then(function (user) {
         if (user) {
         devDealer.send([
         channel
         , wireutil.envelope(new wire.AutoGroupMessage(
         new wire.OwnerMessage(
         user.email
         , user.name
         , user.group
         )
         , message.response
         ))
         ])
         }
         else if (message.currentGroup) {
         pub.send([
         message.currentGroup
         , wireutil.envelope(new wire.JoinGroupByVncAuthResponseMessage(
         message.serial
         , message.response
         ))
         ])
         }
         })
         .catch(function (err) {
         log.error(
         'Unable to lookup user by VNC auth response "%s"'
         , message.response
         , err.stack
         )
         })
         })*/
        .on(wire.ConnectStartedMessage, async(channel, message, data) => {
            //dbapi.setDeviceConnectUrl(message.serial, message.url)
            try {
                dbapi.setDeviceConnectUrl(message.serial, message.url);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceConnectUrl failed:', message)
            }
            log.info('ConnectStartedMessage', message.serial, message.url);
        })
        .on(wire.ConnectStoppedMessage, async(channel, message, data) => {
            //dbapi.unsetDeviceConnectUrl(message.serial)
            try {
                dbapi.unsetDeviceConnectUrl(message.serial);
                pub.send([channel, data])
            } catch (err) {
                log.error('unsetDeviceConnectUrl failed:', message)
            }
            log.info('ConnectStoppedMessage', message.serial);
        })
        .on(wire.JoinGroupMessage, async(channel, message, data) => {
            try {
                dbapi.setDeviceOwner(message.serial, message.owner);
                if (message.usage) {
                    dbapi.setDeviceUsage(message.serial, message.usage)
                }
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceOwner or setDeviceUsage failed:', message)
            }
            log.info('JoinGropMessage', message);
        })
        .on(wire.LeaveGroupMessage, async function (channel, message, data) {
            /*dbapi.unsetDeviceOwner(message.serial, message.owner)
             dbapi.unsetDeviceUsage(message.serial)*/
            log.info('LeaveGroupMessage', message);
            try {
                dbapi.unsetDeviceOwner(message.serial, message.owner);
                dbapi.unsetDeviceUsage(message.serial);
                pub.send([channel, data])
            } catch (err) {
                log.error('unsetDeviceConnectUrl failed:', message)
            }
        })
        .on(wire.DeviceLogMessage, function (channel, message, data) {
            pub.send([channel, data])
        })
        .on(wire.DeviceIdentityMessage, async function (channel, message, data) {
            //dbapi.saveDeviceIdentity(message.serial, message)
            log.info('DeviceIdentityMessage', message);
            try {
                dbapi.saveDeviceIdentity(message.serial, message);
                pub.send([channel, data])
            } catch (err) {
                log.error('saveDeviceIdentity failed:', message)
            }
        })
        .on(wire.TransactionProgressMessage, function (channel, message, data) {
            pub.send([channel, data])
        })
        .on(wire.TransactionDoneMessage, function (channel, message, data) {
            pub.send([channel, data])
        })
        .on(wire.DeviceLogcatEntryMessage, function (channel, message, data) {
            pub.send([channel, data])
        })
        .on(wire.AirplaneModeEvent, async function (channel, message, data) {
            //dbapi.setDeviceAirplaneMode(message.serial, message.enabled)
            log.info('AirplaneModeEvent', message);
            try {
                dbapi.setDeviceAirplaneMode(message.serial, message.enabled);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceAirplaneMode failed:', message)
            }
        })
        .on(wire.BatteryEvent, async function (channel, message, data) {
            //dbapi.setDeviceBattery(message.serial, message)
            log.info('BatteryEvent', message);
            try {
                dbapi.setDeviceBattery(message.serial, message);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceBattery failed:', message)
            }
        })
        .on(wire.DeviceBrowserMessage, async function (channel, message, data) {
            //dbapi.setDeviceBrowser(message.serial, message)
            log.info('DeviceBrowsermessage', message);
            try {
                dbapi.setDeviceBrowser(message.serial, message);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceBrowser failed:', message)
            }
        })
        .on(wire.ConnectivityEvent, async function (channel, message, data) {
            //dbapi.setDeviceConnectivity(message.serial, message)
            log.info('ConnectivityEvent', message);
            try {
                dbapi.setDeviceConnectivity(message.serial, message);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceConnectivity failed:', message)
            }
        })
        .on(wire.PhoneStateEvent, async function (channel, message, data) {
            //dbapi.setDevicePhoneState(message.serial, message)
            log.info('PhoneStateEvent', message);
            try {
                dbapi.setDevicePhoneState(message.serial, message);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDevicePhoneState failed:', message)
            }
        })
        .on(wire.RotationEvent, async function (channel, message, data) {
            //dbapi.setDeviceRotation(message.serial, message.rotation)
            log.info('RotationEvent', message);
            try {
                dbapi.setDeviceRotation(message.serial, message.rotation);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceRotation failed:', message)
            }
        })
        .on(wire.ReverseForwardsEvent, async function (channel, message, data) {
            log.info('ReverseForwardsEvent', message);
            try {
                dbapi.setDeviceReverseForwards(message.serial, message.forwards);
                pub.send([channel, data])
            } catch (err) {
                log.error('setDeviceReverseForwards failed:', message)
            }
        })
        .handler());

    lifecycle.observe(function () {
        [pub, devDealer, pull].forEach(function (sock) {
            try {
                sock.close()
            }
            catch (err) {
                // No-op
            }
        })
    })
};
