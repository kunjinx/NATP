module.exports = {
    dbname: "test",
    user: "root",
    pwd: "password",
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