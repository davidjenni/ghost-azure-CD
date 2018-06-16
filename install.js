'use strict'; 
const log = require('loglevel');
const path = require('path');

log.setLevel('info');
const GhostInstall = require('./ghostInstall');

let bootstrap = new GhostInstall(path.resolve('./app'), log);

bootstrap.run().then(
    () =>
        log.info('Completed'),
    (err) => {
        log.error(`Error: ${err}`);
    });
