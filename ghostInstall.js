'use strict';
const cproc = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const request = require('request');
const util = require('util');

const execFile = util.promisify(cproc.execFile);
const extract = util.promisify(require('extract-zip'));


class GhostInstall {
    constructor(installDir, log) {
        this._installDir = installDir;
        this._log = log;
        this._nodeExe = 'node';
        this._npmExe = 'npm';
    }

    async run(version = 'latest') {
        // TODO: for rollback, don't wipe dir but instead rename
        this._log.info(`Installing ghost into: ${this._installDir}`);
        await fs.emptyDir(this._installDir);
        if (version === 'latest') {
            version = await this.getLatestGhostVersion();
            this._log.info(`Latest ghost version on npm: ${version}`);
        }
        let ghostZip = await this.downloadGhost(version);
        await this.unzipGhost(ghostZip, this._installDir);
    }

    async getLatestGhostVersion() {
        let version = await this._npm('info', 'ghost', 'dist-tags.latest');
        return version.stdout.trim();
    }

    async downloadGhost(version) {
        let ghostDownload = `https://github.com/TryGhost/Ghost/releases/download/${version}/Ghost-${version}.zip`;
        let ghostZip = path.join(process.env.USERPROFILE, 'Downloads', 'ghost.zip');
        this._log.info(`Downloading ${ghostDownload}...`);
        let startTime = Date.now();
        let destStream = fs.createWriteStream(ghostZip);
        await new Promise((resolve, reject) => {
            request(ghostDownload)
                .on('end', (i) => {
                    resolve();
                })
                .on('error', err => {
                    reject(err);
                })
                .pipe(destStream);
        });
        destStream.close();
        let duration = Date.now() - startTime;
        let zipStat = await fs.stat(ghostZip);
        this._log.info(`Downloaded ${zipStat.size} bytes in ${duration} msec`);
        return ghostZip;
    }

    async unzipGhost(ghostZip, installDir) {
        await extract(ghostZip, { dir: installDir });
        this._log.info(`Unzipped app into ${installDir}`);
    }

    _node(args) {
        return this._exec(this._nodeExe, false, args);
    }

    _npm(...args) {
        return this._exec(this._npmExe,  true, args);
    }

    async _exec(exe, useShell, args) {
        return execFile(exe, args, {shell: useShell});
    }
}

module.exports = GhostInstall
