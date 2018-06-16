'use strict';

// only require standard nodejs modules:
const fs = require('fs-extra');
const path = require('path');

const defaultTheme = path.join('themes', 'casper');
const nodeEnv = process.env.NODE_ENV;

async function prepareGhost(repoDir, appDir, log) {
    let environments = [ 'development', 'production' ];
    if (nodeEnv && environments.indexOf(nodeEnv) < 0) {
        environments.unshift(nodeEnv);
    }

    for (let env of environments) {
        const configFile = path.join(repoDir, `config.${env}.json`);
        if (!fs.existsSync(configFile)) {
            if (env !== nodeEnv) {
                continue;
            }
            // config file for NODE_ENV must exist!
            throw Error(`NODE_ENV is set as '${nodeEnv}' but cannot find corresponding file '${configFile}'`);
        }
        log.info(`Configuring ghost for '${env}'`)
        const ghostConfig = new GhostConfig(appDir, configFile, log);
        await ghostConfig.run();
    }
}

module.exports = prepareGhost;

class GhostConfig {
    constructor(appDir, configFile, log) {
        this._appDir = appDir;
        this._configFile = configFile;
        this._log = log;
    }

    async run() {
        this._config = await fs.readJSON(this._configFile);
        let jsonModified = false;
        jsonModified |= await this.ensureContentPath()
        jsonModified |= this.ensurePortSync(process.env.PORT);

        if (jsonModified) {
            await fs.writeFile(this._configFile, JSON.stringify(this._config, null, 2));
            this._log.info(`Updated config file: ${this._configFile}`);
        }

        await this.ensureDbInitialized();
        await this.ensureDefaultTheme();
    }
    
    async ensureContentPath() {
        let configChanged = false;
        let contentPath = this._config.paths.contentPath;
        if (contentPath) {
            if (!path.isAbsolute(contentPath)) {
                contentPath = this._config.paths.contentPath = path.resolve(contentPath);
                configChanged = true;
            }
            await fs.ensureDir(contentPath);
            // ensure common content subdirectories
            for (const subDir of [ 'images', 'logs', 'settings', 'themes' ]) {
                await fs.ensureDir(path.join(contentPath, subDir));
            }
        }
        if (configChanged) {
            this._log.info(`Created contentPath folders under ${contentPath}`);
        }
        return configChanged;
    }

    ensurePortSync(port) {
        if (port && this._config.server.port) {
            this._config.server.port = port;
            return true;
        }
        return false;
    }

    async ensureDefaultTheme() {
        await fs.copy(path.join(this._appDir, 'content', defaultTheme),
            path.join(this._config.paths.contentPath, defaultTheme));
    }

    async ensureDbInitialized() {
        if (this._config.database.client === 'sqlite3') {
            let filename = this._config.database.connection.filename;
            await fs.ensureDir(path.dirname(filename));
            // be conservative, only initialize DB if not present (don't overwrite)
            if (filename && !fs.existsSync(filename)) {
                const knexModule = path.join(this._appDir, 'node_modules', 'knex-migrator');
                const KnexMigrator = require(knexModule);
                let knexMigrator = new KnexMigrator({
                    knexMigratorFilePath: this._appDir
                });
                await knexMigrator.init();
                return;
            }
        }
    }
}

