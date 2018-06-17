'use strict'; 
const log = require('loglevel');
const path = require('path');

const thisDir = __dirname;
const appDir = path.resolve('./app');

log.setLevel('info');
log.info(`Ghost installer running from dir: ${thisDir}`);
log.info(`nodejs env vars: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, node version=${process.version}`);

const installGhost = require('./ghostInstall');
const prepareGhost = require('./ghostPrepare');

installGhost(appDir, log)
    .then(async () => prepareGhost(thisDir, appDir, log))
    .then(
        () =>
            log.info('Completed.'),
        (err) => {
            log.error(`Error: ${err}`);
            process.exit(1);
        });
