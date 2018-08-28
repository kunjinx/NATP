const Sequelize = require('sequelize');

module.exports = {
    users_Options: {
        timestamps: true,
        updatedAt: false,
        freezeTableName: true,
        charset: 'utf8'
    },

    users: {
        createdAt: Sequelize.DATE,
        email: {type: Sequelize.STRING, primaryKey: true},
        group: Sequelize.STRING,
        ip: Sequelize.STRING,
        lastLoggedInAt: Sequelize.DATE,
        name: Sequelize.STRING
    },

    adbKeys: {
        fingerprint: {type: Sequelize.STRING, primaryKey: true},
        title: Sequelize.STRING,
        email: {type: Sequelize.STRING, primaryKey: true}
    }
    ,

    forwards: {
        forwards: {type: Sequelize.STRING, primaryKey: true},
        email: {type: Sequelize.STRING, primaryKey: true}
    }
    ,

    settings: {
        email: {type: Sequelize.STRING, primaryKey: true},
        lastUsedDevice: Sequelize.STRING,
        selectedLanguage: Sequelize.STRING
    }
    ,

    deviceListActiveTabs: {
        details: Sequelize.BOOLEAN,
        icons: Sequelize.BOOLEAN,
        email: {type: Sequelize.STRING, primaryKey: true}
    }
    ,

    deviceListColumns: {
        name: {type: Sequelize.STRING, primaryKey: true},
        selected: Sequelize.BOOLEAN,
        email: {type: Sequelize.STRING, primaryKey: true}
    }
    ,

    deviceListSort: {
        email: {type: Sequelize.STRING, primaryKey: true}
    }
    ,

    fixed: {
        name: {type: Sequelize.STRING, primaryKey: true},
        order: Sequelize.STRING,
        email: {type: Sequelize.STRING, primaryKey: true}
    }
    ,

    user: {
        name: {type: Sequelize.STRING, primaryKey: true},
        order: Sequelize.STRING,
        email: {type: Sequelize.STRING, primaryKey: true}
    }
    ,

    association: (models) => {
        models.users.hasOne(models.settings, {foreignKey: 'email', as: 'settings', onDelete: 'CASCADE'});
        models.users.hasMany(models.adbKeys, {foreignKey: 'email', as: 'adbKeys', onDelete: 'CASCADE'});
        models.users.hasMany(models.forwards, {foreignKey: 'email', as: 'forwards', onDelete: 'CASCADE'});
        models.settings.hasOne(models.deviceListActiveTabs, {
            foreignKey: 'email',
            as: 'deviceListActiveTabs',
            onDelete: 'CASCADE'
        });
        models.settings.hasOne(models.deviceListSort, {foreignKey: 'email', as: 'deviceListSort', onDelete: 'CASCADE'});

        models.settings.hasMany(models.deviceListColumns, {
            foreignKey: 'email',
            as: 'deviceListColumns',
            onDelete: 'CASCADE'
        });
        models.deviceListSort.hasMany(models.fixed, {foreignKey: 'email', as: 'fixed', onDelete: 'CASCADE'});
        models.deviceListSort.hasMany(models.user, {foreignKey: 'email', as: 'user', onDelete: 'CASCADE'});
    }
}
