'use strict';

// only require standard nodejs modules:
const fs = require('fs-extra');
const path = require('path');

const defaultTheme = path.join('themes', 'casper');
const nodeEnv = process.env.NODE_ENV;

async function prepareGhost(repoDir, appDir, log) {
    // single environment if explicitly requested via NODE_ENV
    let environments = nodeEnv ? [ nodeEnv ] : [ 'development', 'production' ];

    for (let env of environments) {
        const configFile = path.join(repoDir, 'config', `config.${env}.json`);
        if (!fs.existsSync(configFile)) {
            if (env !== nodeEnv) {
                continue;
            }
            // config file for NODE_ENV must exist!
            throw Error(`NODE_ENV is set as '${nodeEnv}' but cannot find corresponding file '${configFile}'`);
        }
        log.info(`Configuring ghost for '${env}'`)
        const ghostConfig = new GhostConfig(repoDir, appDir, configFile, log);
        await ghostConfig.run();
    }
}

module.exports = prepareGhost;

class GhostConfig {
    constructor(rootDir, appDir, configFile, log) {
        this._rootDir = rootDir;
        this._appDir = appDir;
        this._configFile = configFile;
        this._log = log;
    }

    async run() {
        this._config = await fs.readJSON(this._configFile);

        // group all steps that modify/update the config.*.json file first:
        await this.ensureContentPath()
        this.ensurePortSync(process.env.PORT);

        const appConfigFile = path.join(this._rootDir, path.basename(this._configFile));
        await fs.writeFile(appConfigFile, JSON.stringify(this._config, null, 2));
        this._log.info(`Updated config file: ${appConfigFile}`);

        // group steps that only read from configuration:
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
        const themeDir = path.join(this._appDir, 'content', defaultTheme);

        await fs.copy(themeDir, path.join(this._config.paths.contentPath, defaultTheme));
        this._log.info(`Copied default theme to ${themeDir}`);
    }

    async ensureDbInitialized() {
        if (this._config.database.client === 'sqlite3') {
            let filename = this._config.database.connection.filename;
            if (!filename) {
                return;
            }
            await fs.ensureDir(path.dirname(filename));
            const dbStat = await fs.exists(filename) ? await fs.stat(filename) : undefined;
            // be conservative, only initialize DB if not present (don't overwrite)
            // or if the DB has not been properly initialized:
            // starting ghost w/o DB, it will create a ~30k large non-functional DB
            if (!dbStat || dbStat.size < 200*1000) {
                const knexModule = path.join(this._appDir, 'node_modules', 'knex-migrator');
                const KnexMigrator = require(knexModule);
                let knexMigrator = new KnexMigrator({
                    knexMigratorFilePath: this._appDir
                });
                await knexMigrator.init();
                this._log.info(`Created new sqlite3 DB as: ${filename}`);
            } else {
                this._log.info(`Not touching existing sqlite3 DB ${filename}`);
            }
        }
    }
}
