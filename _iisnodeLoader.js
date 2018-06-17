// iisnode cannot directly load ghost's entry script in a nested folder
// See: https://github.com/tjanczuk/iisnode/issues/338

// HACK: ghost does not evalute the PORT env variable but
// instead only expects it to be set in the config.*.json
// This unfortunately breaks when running under iisnode:
// it create a pipe and set PORT with its name
// BUG: https://github.com/davidjenni/ghost-azure/issues/1

function injectPortIntoConfig(port) {
    const fs = require('fs-extra');
    const path = require('path');

    let nodeEnv = process.env.NODE_ENV || 'production';
    let configFile = path.join(__dirname, `config.${nodeEnv}.json`);
    let config = JSON.parse(fs.readFileSync(configFile));
    if (port && config.server.port) {
        config.server.port = port;
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        console.log(`Updated config ${configFile} with PORT: ${port}`);
    }
}

injectPortIntoConfig(process.env.PORT);
require(__dirname + '/app/index.js');
