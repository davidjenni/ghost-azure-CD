'use strict'; 
const log = require('loglevel');
const path = require('path');

const thisDir = __dirname;
const appDir = path.resolve('./app');

log.setLevel('info');

const installGhost = require('./ghostInstall');
const prepareGhost = require('./ghostPrepare');

installGhost(appDir, log)
    .then(async () => prepareGhost(thisDir, appDir, log))
    .then(
        () =>
            log.info('Completed'),
        (err) => {
            log.error(`Error: ${err}`);
        });
