const dbapi = require('../../../db/api');
const logger = require('../../../util/logger');
const datautil = require('../../../util/datautil');

const log = logger.createLogger('api:controllers:devices');

module.exports = {
    'GET /api/devices': async(ctx, next) => {
        try {
            let cursor = await dbapi.loadDevices();
            let list = await cursor.toArray();
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
            ctx.response.status(500);
            ctx.rest({
                success: false
            })
        }
    }
    , 'GET /api/device/:serial': async(ctx, next) => {
        let serial = ctx.params.serial;
        try {
            let device = await dbapi.loadDevice(serial);
            if (!device) {
                ctx.response.status(404);
                ctx.rest({
                    success: false
                    , description: 'Device not found'
                });
                return;
            }
            datautil.normalize(device, ctx.user);
            ctx.rest({
                success: true
                , device: device
            });
        } catch (err) {
            log.error('Failed to load device "%s": ', ctx.params.serial, err.stack)
            ctx.response.status(500);
            ctx.rest({
                success: false
            })
        }
    }
}
;