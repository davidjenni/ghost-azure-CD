'use strict'; 
/* eslint no-console: "off" */

const GhostBootstrap = require('./GhostBootstrap');

let bootstrap = new GhostBootstrap();

bootstrap.run().then(
    () =>
        console.log('Completed'),
    (err) => {
        console.log(`Error: ${err}`);
    });
