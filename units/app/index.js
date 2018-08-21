const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const controller = require('./middleware/controller');

const templating = require('./middleware/templating');

const logger = require('../../util/logger');


module.exports = function (options) {
    const log = logger.createLogger('app');
    const app = new Koa();

    const isProduction = process.env.NODE_ENV === 'production';

    // log request URL:
    app.use(async(ctx, next) => {
        log.info(`Process ${ctx.request.method} ${ctx.request.url}...`);
        var
            start = new Date().getTime(),
            execTime;
        await next();
        execTime = new Date().getTime() - start;
        ctx.response.set('X-Response-Time', `${execTime}ms`);
    });

// static file support:
    if (!isProduction) {
        let staticFiles = require('./middleware/static-files');
        app.use(staticFiles('/static/', __dirname + '/static'));
    }

// parse request body:
    app.use(bodyParser());

// add nunjucks as view:
    app.use(templating('app/views', {
        noCache: !isProduction,
        watch: !isProduction
    }));

// add controller:
    app.use(controller());

    app.listen(options.port);
    log.info('app started at port 3000...');

}
