'use strict';

// only require standard nodejs modules:
const fs = require('fs');
const path = require('path');

const ghostAppFolder = 'app';

const nodeEnv = process.env.NODE_ENV || 'development';
const configFile = `config.${nodeEnv}.json`;
if (fs.existsSync(configFile)) {
    let config = JSON.parse(fs.readFileSync(configFile));

    let writeJson = false;
    writeJson |= ensureContentPath(config);
    writeJson |= ensurePort(config, process.env.PORT);
    ensureDefaultTheme(config);

    if (writeJson) {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        console.log(`Updated config file: ${configFile}`);;
    }
    promiseDbInitialized(config)
    .then(
        () =>
            console.log('first run configuration completed.'),
        (error) => {
            console.log(`Error initializing ghost DB: ${error}\n${error.stack}`);
            process.exit(1);
        });
}
else {
    console.log(`Cannot find config file ${configFile}`);
    process.exit(1);
}

function promiseDbInitialized(config) {
    if (config.database.client === 'sqlite3') {
        let filename = config.database.connection.filename;
        ensureDir(path.dirname(filename));
        if (filename && !fs.existsSync(filename)) {
            const KnexMigrator = require(`./${ghostAppFolder}/node_modules/knex-migrator`);
            let knexMigrator = new KnexMigrator({
                knexMigratorFilePath: ghostAppFolder
            });
            return knexMigrator.init();
        }
    }
}

function ensureContentPath(config) {
    let configChanged = false;
    let contentPath = config.paths.contentPath;
    if (contentPath) {
        if (!path.isAbsolute(contentPath)) {
            contentPath = config.paths.contentPath = path.resolve(contentPath);
            configChanged = true;
        }
        ensureDir(contentPath);
        // ensure common content subdirectories
        [ 'images', 'logs', 'settings', 'themes' ]
            .forEach(subDir =>
                ensureDir(path.join(contentPath, subDir)));
    }
    return configChanged;
}

function ensurePort(config, port) {
    if (port && config.server.port) {
        config.server.port = port;
        return true;
    }
    return false;
}

function ensureDefaultTheme(config) {
    copyRecursive(path.join(ghostAppFolder, 'content', 'themes', 'casper'),
        path.join(config.paths.contentPath, 'themes', 'casper'));
}

// file system helpers (avoiding require-ing additional packages like fs-extra):
function ensureDir(dirname) {
    let startDir = '.';
    path.relative(startDir, dirname)
        .split(path.sep)
        .reduce((currPath, childDir) => {
            let newDir = path.join(currPath, childDir);
            if (!fs.existsSync(newDir)) {
                fs.mkdirSync(newDir);
            }
            return newDir;
        }, startDir);
}

function copyRecursive(src, dest) {
    let srcStats = fs.existsSync(src) && fs.statSync(src);
    if (srcStats && srcStats.isDirectory()) {
        fs.mkdirSync(dest);
        fs.readdirSync(src)
            .forEach(child => copyRecursive(path.join(src, child), path.join(dest, child)));
    }
    else {
        fs.copyFileSync(src, dest);
    }
}
