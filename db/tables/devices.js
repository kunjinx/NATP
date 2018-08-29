const Sequelize = require('sequelize');

module.exports = {
    devices_Options: {
        timestamps: true,
        updatedAt: false,
        freezeTableName: true,
        charset: 'utf8'
    },

    devices: {
        createdAt: Sequelize.DATE,
        presenceChangedAt: Sequelize.DATE,
        present: Sequelize.BOOLEAN,
        ready: Sequelize.BOOLEAN,
        remoteConnect: Sequelize.BOOLEAN,
        remoteConnectUrl: Sequelize.STRING,
        serial: { type: Sequelize.STRING, primaryKey: true },
        status: Sequelize.INTEGER,
        statusChangedAt: Sequelize.DATE,
        usage: Sequelize.STRING,
        abi: Sequelize.STRING,
        airplaneMode: Sequelize.BOOLEAN,
        channel: Sequelize.STRING,
        cpuPlatform: Sequelize.STRING,
        manufacturer: Sequelize.STRING,
        model: Sequelize.STRING,
        openGLESVersion: Sequelize.STRING,
        operator: Sequelize.STRING,
        platform: Sequelize.STRING,
        product: Sequelize.STRING,
        sdk: Sequelize.STRING,
        version: Sequelize.STRING,
        usageChangedAt: Sequelize.DATE,
        notes: Sequelize.STRING
    },
    network: {
        connected: Sequelize.BOOLEAN,
        failover: Sequelize.BOOLEAN,
        roaming: Sequelize.BOOLEAN,
        subtype: Sequelize.STRING,
        type: Sequelize.STRING,
        state: Sequelize.STRING,
        manual: Sequelize.STRING,
        operator: Sequelize.STRING,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    battery: {
        health: Sequelize.STRING,
        level: Sequelize.INTEGER,
        scale: Sequelize.INTEGER,
        source: Sequelize.STRING,
        status: Sequelize.STRING,
        temp: Sequelize.FLOAT,
        voltage: Sequelize.FLOAT,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    owner: {
        value: Sequelize.STRING,
        email: Sequelize.STRING,
        group: Sequelize.STRING,
        name: Sequelize.STRING,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    provider: {
        channel: Sequelize.STRING,
        name: Sequelize.STRING,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    reverseForwards: {
        forwards: { type: Sequelize.STRING, primaryKey: true },
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    browser: {
        selected: Sequelize.BOOLEAN,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    apps: {
        id: { type: Sequelize.STRING, primaryKey: true },
        name: Sequelize.STRING,
        selected: Sequelize.BOOLEAN,
        system: Sequelize.BOOLEAN,
        type: Sequelize.STRING,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    display: {
        density: Sequelize.FLOAT,
        fps: Sequelize.DOUBLE,
        height: Sequelize.INTEGER,
        id: Sequelize.INTEGER,
        rotation: Sequelize.INTEGER,
        secure: Sequelize.BOOLEAN,
        size: Sequelize.DOUBLE,
        url: Sequelize.STRING,
        width: Sequelize.INTEGER,
        xdpi: Sequelize.DOUBLE,
        ydpi: Sequelize.DOUBLE,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },
    phone: {
        iccid: Sequelize.STRING,
        imei: Sequelize.STRING,
        imsi: Sequelize.STRING,
        network: Sequelize.STRING,
        phoneNumber: Sequelize.STRING,
        serial: { type: Sequelize.STRING, primaryKey: true }
    },


    association: (models) => {
        models.devices.hasOne(models.provider, { foreignKey: 'serial', as: 'provider', onDelete: 'CASCADE' });
        models.devices.hasOne(models.battery, { foreignKey: 'serial', as: 'battery', onDelete: 'CASCADE' });
        models.devices.hasOne(models.browser, { foreignKey: 'serial', as: 'browser', onDelete: 'CASCADE' });
        models.devices.hasOne(models.display, { foreignKey: 'serial', as: 'display', onDelete: 'CASCADE' });
        models.devices.hasOne(models.network, { foreignKey: 'serial', as: 'network', onDelete: 'CASCADE' });
        models.devices.hasOne(models.phone, { foreignKey: 'serial', as: 'phone', onDelete: 'CASCADE' });
        models.devices.hasOne(models.owner, { foreignKey: 'serial', as: 'owner', onDelete: 'CASCADE' });

        models.devices.hasMany(models.reverseForwards, { foreignKey: 'serial', as: 'reverseForwards', onDelete: 'CASCADE' });
        models.browser.hasMany(models.apps, { foreignKey: 'serial', as: 'apps', onDelete: 'CASCADE' });
    }
}
