const Sequelize = require('sequelize');
const conn = require('./conn');
var fs = require('fs');
var Promise = require('bluebird');

const sequelize = new Sequelize(conn.dbname, conn.user, conn.pwd, conn.options);
var tables = fs.readdirSync('./db/tables');
var db = Object.create(null);

module.exports = function () {
    for (i in tables) {
        var table = require('./tables/' + tables[i]);
        var tableName = tables[i].split('.')[0];
        db[tableName] = Object.create(null);
        var defaultOptions = {
            timestamps: false,
            freezeTableName: true,
            charset: 'utf8'
        };
        var Options;
        for (key in table) {
            if (typeof (table[key]) != 'function') {
                if (key.indexOf('Options') != -1) {
                    Options = table[key];
                    continue;
                };
                db[tableName][key] = sequelize.define(tableName+'_' + key, table[key], Options);
                Options = defaultOptions;
            } else {
                db[tableName].association = table[key];
            }
        }
        table.association(db[tableName]);
    };
    db.initialTables = function () {
        return sequelize.sync({ logging: false })
            .then(() => {
                console.log('Initialing tables successfully!');//后面更换成后台日志
            })
            .catch(err => {

                if (err) {
                    console.log('Failed to initial tables! Info--%s : %s', err.name, err.message);
                }
                return Promise.delay(2000).then(() => {
                    db.initialTables()
                });
            });
    }
    return db;
}


