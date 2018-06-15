'use strict';
const cproc = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const request = require('request');
const util = require('util');

const execFile = util.promisify(cproc.execFile);


class GhostBootstrap {
    constructor() {
        this._nodeExe = 'node';
        this._npmExe = 'npm';
    }

    async run() {
        let latestVersion = await this.getLatestGhostVersion();

        let ghostDownload = `https://github.com/TryGhost/Ghost/releases/download/${latestVersion}/Ghost-${latestVersion}.zip`;
        let ghostZip = path.join(process.env.USERPROFILE, 'Downloads', 'ghost.zip');
        await new Promise((resolve, reject) => {
            request(ghostDownload)
                .on('response', res => {
                    res.statusCode;
                    resolve();
                })
                .on('error', err => {
                    reject(err);
                })
                .pipe(fs.createWriteStream(ghostZip));
        });
    }

    async getLatestGhostVersion() {
        let version = await this._npm('info', 'ghost', 'dist-tags.latest');
        return version.stdout.trim();
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

module.exports = GhostBootstrap
