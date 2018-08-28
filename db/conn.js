module.exports = {
    dbname: "sequelizetest",
    user: "root",
    pwd: "8257226",
    options: {
        host: "localhost",
        dialect: "mysql",
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
}