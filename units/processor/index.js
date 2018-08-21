const Promise = require('bluebird');

const logger = require('../../util/logger');
const wire = require('../../wire/index');
const wirerouter = require('../../wire/router');
const wireutil = require('../../wire/util');
//const db = require('../../db/index')
//const dbapi = require('../../db/api')
const lifecycle = require('../../util/lifecycle');
const srv = require('../../util/srv');
const zmqutil = require('../../util/zmqutil');

//module.exports = db.ensureConnectivity(function (options) {
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
            /*dbapi.saveDeviceInitialState(message.serial, message)
             .then(function () {
             devDealer.send([
             message.provider.channel
             , wireutil.envelope(new wire.DeviceRegisteredMessage(
             message.serial
             ))
             ])
             pub.send([channel, data])
             })*/
            devDealer.send([
                message.provider.channel
                , wireutil.envelope(new wire.DeviceRegisteredMessage(
                    message.serial
                ))
            ]);
            pub.send([channel, data]);
            log.info('DeviceIntroductionMessage:', message.serial)
        })
        // Workerless messages
        .on(wire.DevicePresentMessage, function (channel, message, data) {
            //dbapi.setDevicePresent(message.serial)
            log.info('DevicePresentMessage', message.serial);
            pub.send([channel, data])
        })
        .on(wire.DeviceAbsentMessage, function (channel, message, data) {
            //dbapi.setDeviceAbsent(message.serial)
            log.info('DeviceAbsentMessage', message.serial);
            pub.send([channel, data])
        })
        .on(wire.DeviceStatusMessage, function (channel, message, data) {
            //dbapi.saveDeviceStatus(message.serial, message.status)
            log.info('DeviceStatusMessage', message.serial, message.status);
            pub.send([channel, data])
        })
        .on(wire.DeviceHeartbeatMessage, function (channel, message, data) {
            pub.send([channel, data])
        })
        // Worker initialized
        .on(wire.DeviceReadyMessage, function (channel, message, data) {
            /* dbapi.setDeviceReady(message.serial, message.channel)
             .then(function () {
             devDealer.send([
             message.channel
             , wireutil.envelope(new wire.ProbeMessage())
             ])

             pub.send([channel, data])
             })*/
            devDealer.send([
                message.channel
                , wireutil.envelope(new wire.ProbeMessage())
            ]);

            log.info('DeviceReadyMessage', message.serial);

            pub.send([channel, data])
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
        .on(wire.ConnectStartedMessage, function (channel, message, data) {
            //dbapi.setDeviceConnectUrl(message.serial, message.url)
            log.info('ConnectStartedMessage', message.serial, message.url);
            pub.send([channel, data])
        })
        .on(wire.ConnectStoppedMessage, function (channel, message, data) {
            //dbapi.unsetDeviceConnectUrl(message.serial)
            log.info('ConnectStoppedMessage', message.serial);
            pub.send([channel, data])
        })
        .on(wire.JoinGroupMessage, function (channel, message, data) {
            /*dbapi.setDeviceOwner(message.serial, message.owner)
             if (message.usage) {
             dbapi.setDeviceUsage(message.serial, message.usage)
             }*/
            log.info('JoinGropMessage', message);
            pub.send([channel, data])
        })
        .on(wire.LeaveGroupMessage, function (channel, message, data) {
            /*dbapi.unsetDeviceOwner(message.serial, message.owner)
             dbapi.unsetDeviceUsage(message.serial)*/
            log.info('LeaveGroupMessage', message);
            pub.send([channel, data])
        })
        .on(wire.DeviceLogMessage, function (channel, message, data) {
            pub.send([channel, data])
        })
        .on(wire.DeviceIdentityMessage, function (channel, message, data) {
            //dbapi.saveDeviceIdentity(message.serial, message)
            log.info('DeviceIdentityMessage', message);
            pub.send([channel, data])
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
        .on(wire.AirplaneModeEvent, function (channel, message, data) {
            //dbapi.setDeviceAirplaneMode(message.serial, message.enabled)
            log.info('AirplaneModeEvent', message);
            pub.send([channel, data])
        })
        .on(wire.BatteryEvent, function (channel, message, data) {
            //dbapi.setDeviceBattery(message.serial, message)
            log.info('BatteryEvent', message);
            pub.send([channel, data])
        })
        .on(wire.DeviceBrowserMessage, function (channel, message, data) {
            //dbapi.setDeviceBrowser(message.serial, message)
            log.info('DeviceBrowsermessage', message);
            pub.send([channel, data])
        })
        .on(wire.ConnectivityEvent, function (channel, message, data) {
            //dbapi.setDeviceConnectivity(message.serial, message)
            log.info('ConnectivityEvent', message);
            pub.send([channel, data])
        })
        .on(wire.PhoneStateEvent, function (channel, message, data) {
            //dbapi.setDevicePhoneState(message.serial, message)
            log.info('PhoneStateEvent', message);
            pub.send([channel, data])
        })
        .on(wire.RotationEvent, function (channel, message, data) {
            //dbapi.setDeviceRotation(message.serial, message.rotation)
            log.info('RotationEvent', message);
            pub.send([channel, data])
        })
        .on(wire.ReverseForwardsEvent, function (channel, message, data) {
            //dbapi.setDeviceReverseForwards(message.serial, message.forwards)
            log.info('ReverseForwardsEvent', message);
            pub.send([channel, data])
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
