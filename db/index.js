var db = (require('./setup'))();
var dbapi = Object.create(null);
const Op = require('sequelize').Op;
var Promise = require('bluebird');



var depth1 = [{ all: true }];
var depth2 = [{ all: true, include: [{ all: true }] }];
var depth3 = [{ all: true, include: [{ all: true, include: [{ all: true }] }] }]

/**
 * @author mvlin
 * @Date 2018-9-20
 * @Version 0.50
 */

//dbapi.devices
{
    var Devices = db.devices.devices;
    var Provider = db.devices.provider;
    var Owner = db.devices.owner;
    var Battery = db.devices.battery;
    var Browser = db.devices.browser;
    var Network = db.devices.network;
    var Display = db.devices.display;
    var ReverseForwards = db.devices.reverseForwards;
    var Phone = db.devices.phone;
    var Apps = db.devices.apps;



    deviceUpdate = (serial, instance, Model, data) => {
        if (instance) {
            return instance.update(data, { logging: false });
        } else {
            data.serial = serial;
            return Model.create(data, { logging: false });
        }
    }

    deviceUpdateArray = (serial, instanceArray, Model, dataArray) => {
        if (instanceArray.length > 0) {
            return Model.destroy({ where: { serial: serial }, logging: false })
                .then(() => {
                    for (i in dataArray) {
                        dataArray[i].serial = serial;
                    }
                    return Model.bulkCreate(dataArray, { logging: false });
                })
        } else {
            for (i in dataArray) {
                dataArray[i].serial = serial;
            }
            return Model.bulkCreate(dataArray, { logging: false });
        }
    }

    dbapi.saveDeviceInitialState = async function (serial, devicedata) {
        var data = {
            present: false
            , presenceChangedAt: new Date()
            , status: devicedata.status
            , statusChangedAt: new Date()
            , ready: false
            , remoteConnect: false
            , remoteConnectUrl: null
            , usage: null
        }
        var device = await Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
        if (device) {
            await Promise.all([
                device.update(data, { logging: false }),
                (function () {
                    return deviceUpdate(device.serial, device.provider, Provider, devicedata.provider)
                })(),
                (function () {
                    return Owner.destroy({ where: { serial: device.serial }, logging: false })
                })(),
                (function () {
                    return deviceUpdateArray(device.serial, device.reverseForwards, ReverseForwards, [])
                })()
            ])
            console.log('Updated device data successfully!')
        } else {
            data.serial = serial;
            data.provider = devicedata.provider;
            await Devices.create(data, {
                logging: false, include: [{ all: true, include: depth1 }]
            })
            console.log('Created user data successfully!')
        }
        return Promise.resolve()
    }

    dbapi.setDeviceConnectUrl = function (serial, url) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ remoteConnectUrl: url, remoteConnect: true }, { logging: false })
                        .then(() => console.log('Setted device connect URL successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.unsetDeviceConnectUrl = function (serial) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ remoteConnectUrl: null, remoteConnect: false }, { logging: false })
                        .then(() => console.log('Unsetted device connect URL successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.saveDeviceStatus = function (serial, status) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ status: status, statusChangedAt: new Date() }, { logging: false })
                        .then(() => console.log('Saved device status successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceOwner = function (serial, owner) {
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return deviceUpdate(device.serial, device.owner, Owner, owner)
                        .then(() => console.log('Setted device owner successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.unsetDeviceOwner = function (serial) {
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return Owner.destroy({ where: { serial: device.serial }, logging: false })
                        .then(() => console.log('Unsetted device owner successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDevicePresent = function (serial) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ present: true, presenceChangedAt: new Date() }, { logging: false })
                        .then(() => console.log('Setted device present successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceAbsent = function (serial) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ present: false, presenceChangedAt: new Date() }, { logging: false })
                        .then(() => console.log('Unsetted device present successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceUsage = function (serial, usage) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ usage: usage, usageChangedAt: new Date() }, { logging: false })
                        .then(() => console.log('Setted device usage successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.unsetDeviceUsage = function (serial) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ usage: null, usageChangedAt: new Date() }, { logging: false })
                        .then(() => console.log('Unsetted device usage successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceAirplaneMode = function (serial, enabled) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ airplaneMode: enabled }, { logging: false })
                        .then(() => console.log('Setted device airplane mode successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceBattery = function (serial, battery) {
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return deviceUpdate(device.serial, device.battery, Battery, battery)
                        .then(() => console.log('Setted device battery successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceBrowser = function (serial, browser) {
        return Devices.findOne({ where: { serial: serial }, include: depth2, logging: false })
            .then(device => {
                if (device) {
                    return deviceUpdate(device.serial, device.browser, Browser, browser)
                        .then(() => device.reload({ include: [{ all: true, include: [{ all: true }] }], logging: false }))
                        .then(() => deviceUpdateArray(device.serial, device.browser.apps, Apps, browser.apps))
                        .then(() => console.log('Setted device browser successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceConnectivity = function (serial, connectivity) {
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return deviceUpdate(device.serial, device.network, Network, connectivity)
                        .then(() => console.log('Setted device connectivity successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDevicePhoneState = function (serial, state) {
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return deviceUpdate(device.serial, device.network, Network, state)
                        .then(() => console.log('Setted device phonestate successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceRotation = function (serial, rotation) {
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return deviceUpdate(device.serial, device.display, Display, { rotation: rotation })
                        .then(() => console.log('Setted device rotation successfully!'))
                } else {
                    throw new Error('There is no data for such device!')
                }
            });
    }

    dbapi.setDeviceNote = function (serial, note) {
        return Devices.findOne({ where: { serial: serial }, logging: false })
            .then(device => {
                if (device) {
                    return device.update({ notes: note }, { logging: false })
                        .then(() => console.log('Setted device note successfully!'));
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceReverseForwards = function (serial, forwards) {
        for (i in forwards) {
            forwards[i] = { forwards: forwards[i] }
        }
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return deviceUpdateArray(device.serial, device.reverseForwards, ReverseForwards, forwards)
                        .then(() => console.log('Setted device reverseforwards successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            });
    }

    dbapi.setDeviceReady = function (serial, channel) {
        var data = { channel: channel, ready: true };
        return Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
            .then(device => {
                if (device) {
                    return Promise.all([
                        device.update(data, { logging: false }),
                        (function () {
                            return Owner.destroy({ where: { serial: device.serial }, logging: false })
                        })(),
                        (function () {
                            return deviceUpdateArray(device.serial, device.reverseForwards, ReverseForwards, [])
                        })()
                    ])
                        .then(() => console.log('Setted device ready successfully!'))
                } else {
                    throw new Error('There is no such device!');
                }
            })
    }

    dbapi.saveDeviceIdentity = async function (serial, identity) {
        var data = {
            platform: identity.platform
            , manufacturer: identity.manufacturer
            , operator: identity.operator
            , model: identity.model
            , version: identity.version
            , abi: identity.abi
            , sdk: identity.sdk
            , product: identity.product
            , cpuPlatform: identity.cpuPlatform
            , openGLESVersion: identity.openGLESVersion
        }
        var device = await Devices.findOne({ where: { serial: serial }, include: depth1, logging: false })
        if (device) {
            await Promise.all([
                device.update(data, { logging: false }),
                deviceUpdate(device.serial, device.phone, Phone, identity.phone),
                deviceUpdate(device.serial, device.display, Display, identity.display)
            ])
            console.log('Setted device identity successfully!')
        } else {
            throw new Error('There is no such device!');
        }
    }



    dbapi.loadDevices = function () {
        return Devices.findAll({ include: depth2 ,logging:false})
            .then(result => {
                if (result.length > 1) {
                    for (i in result) {
                        result[i] = result[i].get({ plain: true })
                    }
                }
                console.log('Found device data successfully!')
                return result
            })
    }

    dbapi.loadPresentDevices = function () {
        return Devices.findAll({ where: { present: true}, include: depth2 , logging: false })
            .then(result => {
                if (result.length > 1) {
                    for (i in result) {
                        result[i] = result[i].get({ plain: true })
                    }
                }
                console.log('Found device data successfully!')
                return result
            })
    }

    dbapi.loadDevice = function (serial) {
        return Devices.findOne({ where: { serial: serial }, include: depth2, logging: false })
            .then(result => {
                if (result) {
                    console.log('Found device data successfully!')
                    return result.get({ plain: true })
                }
                else {
                    console.log('Found nothing!')
                    return result
                }
            })
    }

    dbapi.loadUserDevices = function (email) {
        return Devices.findAll({ where: { '$owner.email$': email }, include: depth2, logging: false })
            .then(result => {
                if (result.length > 1) {
                    for (i in result) {
                        result[i] = result[i].get({ plain: true })
                    }
                }
                console.log('Found device data successfully!')
                return result
            })
    }
}
//dbapi.users
{
    var Users = db.users.users;
    var Settings = db.users.settings;
    var AdbKeys = db.users.adbKeys;
    var DeviceListColumns = db.users.deviceListColumns;
    var DeviceListSort = db.users.deviceListColumns;
    var DeviceListActiveTabs = db.users.deviceListActiveTabs;
    var User = db.users.user;
    var Fixed = db.users.fixed;

    userUpdate = (email, instance, Model, data) => {
        if (instance) {
            return instance.update(data, { logging: false });
        } else {
            data.email = email;
            return Model.create(data, { logging: false });
        }
    }

    userUpdateArray = (email, instanceArray, Model, dataArray) => {
        if (instanceArray.length > 0) {
            return Model.destroy({ where: { email: email }, logging: false })
                .then(() => {
                    for (i in dataArray) {
                        dataArray[i].email = email;
                    }
                    return Model.bulkCreate(dataArray, { logging: false });
                })
        } else {
            for (i in dataArray) {
                dataArray[i].email = email;
            }
            return Model.bulkCreate(dataArray, { logging: false });
        }
    }

    dbapi.saveUserAfterLogin = function (userdata) {
        return Users.findOne({ where: { email: userdata.email }, logging: false })
            .then(user => {
                if (user) {
                    return user.update({
                        name: userdata.name,
                        ip: userdata.ip,
                        lastLoggedInAt: new Date()
                    }, { logging: false })
                        .then(() => console.log('Updated user data successfully!'));
                } else {
                    return Users.create({
                        email: userdata.email,
                        ip: userdata.ip,
                        name: userdata.name,
                        lastLoggedInAt: new Date(),
                        settings: {
                            deviceListSort: {}
                        }
                    }, { logging: false, include: depth3 })
                        .then(() => console.log('Created user data successfully!'));
                }
            })
    }

    dbapi.loadUser = function (email) {
        return Users.findOne({
            where: { email: email }
            , logging: false, include: depth3
        })
            .then(found => {
                if (found) {
                    console.log('Found user data successfully!');
                    return found.get({ plain: true });
                } else {
                    return found
                }
            });

    }


    dbapi.updateUserSettings = async function (email, changes) {
        var user = await Users.findOne({ where: { email: email }, logging: false, include: depth3 })
        if (user) {
            await Promise.all([
                user.settings.update({ lastUsedDevice: changes.lastUsedDevice, selectedLanguage: changes.selectedLanguage }, { logging: false }),
                userUpdate(user.email, user.settings.deviceListActiveTabs, DeviceListActiveTabs, changes.deviceListActiveTabs),
                userUpdateArray(user.email, user.settings.deviceListColumns, DeviceListColumns, changes.deviceListColumns),
                userUpdate(user.email, user.settings.deviceListSort, DeviceListSort, { email: email })
            ])
            await Promise.all([
                userUpdateArray(user.email, user.settings.deviceListSort.fixed, Fixed, changes.deviceListSort.fixed),
                userUpdateArray(user.email, user.settings.deviceListSort.user, User, changes.deviceListSort.user)
            ])
            console.log('Updated user settings successfully!')
            return Promise.resolve()
        }
        else {
            throw new Error('There is no any data for such user!');
        }
    }


    dbapi.resetUserSettings = async function (email) {
        var user = await Users.findOne({ where: { email: email }, logging: false, include: depth1 })
        if (user) {
            var reset = {
                deviceListSort: {}
            }
            var set = Settings.build(reset, { include: depth2 })
            await user.settings.destroy({ logging: false })
            await user.setSettings(set, { logging: false })
            console.log('Reseted user settings successfully!')
            return Promise.resolve()
        } else {
            throw new Error('There is no any data for such user!');
        }
    }

    dbapi.insertUserAdbKey = function (email, key) {
        return Users.findOne({ where: { email: email }, logging: false, include: depth1 })
            .then((user) => {
                if (user) {
                    var data = {
                        email: email,
                        fingerprint: key.fingerprint,
                        title: key.title
                    }
                    if (JSON.stringify(user.adbKeys).indexOf(key.fingerprint) == -1) {
                        return AdbKeys.create(data, { logging: false })
                            .then(() => console.log('Inserted user adbkey successfully!'))
                    } else {
                        throw new Error('These user already have this adbKey')
                    }
                } else {
                    throw new Error('There is no any data for such user!');
                }
            })
    }
    dbapi.deleteUserAdbKey = async function (email, fingerprint) {
        var adbkey = await AdbKeys.findOne({ where: { email: email, fingerprint: fingerprint }, logging: false })
        if (adbkey) {
            await adbkey.destroy({ logging: false })
            console.log('Deleted adbkey successfully!')
        } else {
            throw new Error('There is no such adbkey');
        }
    }

    dbapi.lookupUsersByAdbKey = async function (fingerprint) {
        var adbkeys = await AdbKeys.findAll({ where: { fingerprint: fingerprint }, logging: false })
        var emails = []
        if (adbkeys) {
            for (i in adbkeys) {
                emails.push(adbkeys[i].email)
            }
            var users = await Users.findAll({
                where: {
                    email: {
                        [Op.or]: emails
                    }
                }
                , logging: false
                , include: depth3
            })
            for (i in users) {
                users[i] = users[i].get({ plain: true })
            }
            return Promise.resolve(users)
        }
    }

    dbapi.lookupUserByAdbFingerprint = function (fingerprint) {
        return dbapi.lookupUsersByAdbKey(fingerprint)
            .then(users => {
                if (users.length > 0) {
                    if (users.length > 1) {
                        throw new Error('Found multiple users for same ADB fingerprint');
                    }
                    return users[0];
                } else {
                    return users;
                }
            })
    }

    dbapi.getUserPassword = function (email) {
        return dbapi.Users.findOne({ where: { email: email }, logging: false })
            .then(user => {
                if (user) {
                    return user.password
                } else {
                    return null
                }
            })
    }

    dbapi.setUserPassword = function (email, password) {
        return dbapi.Users.findOne({ where: { email: email }, logging: false })
            .then(user => {
                if (user) {
                    return user.update({
                        password: password
                    }, { logging: false })
                        .then(() => console.log('Setted user password successfully!'));
                } else {
                    throw new Error('Could not found this user')
                }
            })
    }
}

//accessTokens,vncauth,logs,users暂未做

module.exports = dbapi;
