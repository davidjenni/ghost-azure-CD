'use strict';
const cproc = require('child_process');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const request = require('request');
const semver = require('semver');
const util = require('util');

const execFile = util.promisify(cproc.execFile);
const extract = util.promisify(require('extract-zip'));

async function  installGhost(installDir, nodeExe, log, ghostVersion) {
    const ghostInstall = new GhostInstall(installDir, nodeExe, log);
    await ghostInstall.run(ghostVersion);
}

module.exports = installGhost;

class GhostInstall {
    constructor(installDir, nodeExe, log) {
        this._installDir = installDir;
        this._log = log;
        this._nodeExe = nodeExe;
        this._log.info(`node exe: ${nodeExe}`);
        this._userDownloadsDir = path.join(os.tmpdir(), 'ghost-azure');
    }

    async run(ghostVersion) {
        this._log.info(`Installing ghost into: ${this._installDir}`);
        if (ghostVersion === 'latest') {
            ghostVersion = await this.getLatestGhostVersion();
            this._log.info(`Latest ghost version on npm: ${ghostVersion}`);
        }
        const localGhostVersion = await this.getLocalGhostVersion();
        if (localGhostVersion && semver.eq(ghostVersion, localGhostVersion)) {
            this._log.info(`Requested version ${ghostVersion} is the same as already found locally.\nSkipping downloading and unzipping ghost version.`);
        } else {
            // TODO: for rollback, don't wipe dir but instead rename
            await fs.emptyDir(this._installDir);
            let ghostZip = await this.downloadGhost(ghostVersion);
            await this.unzipGhost(ghostZip, this._installDir);
        }
        await this.yarnInstall(this._installDir);
    }

    async getLatestGhostVersion() {
        let version = await this._yarn('info', '--silent', 'ghost', 'dist-tags.latest');
        return version.stdout.trim();
    }

    async getLocalGhostVersion() {
        const ghostPackageJsonFile = path.join(this._installDir, 'package.json');
        if (!await fs.exists(ghostPackageJsonFile)) {
            return undefined;
        }
        const ghostPackage = await fs.readJSON(ghostPackageJsonFile);
        return ghostPackage.version;
    }

    async downloadGhost(version) {
        let ghostDownload = `https://github.com/TryGhost/Ghost/releases/download/${version}/Ghost-${version}.zip`;
        let ghostZip = path.join(this._userDownloadsDir, 'ghost.zip');
        this._log.info(`Downloading ${ghostDownload}...`);
        let startTime = Date.now();
        await fs.ensureDir(path.dirname(ghostZip));
        let destStream = fs.createWriteStream(ghostZip);
        await new Promise((resolve, reject) => {
            request(ghostDownload)
                .on('end', () => {
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

    async yarnInstall(installDir) {
        this._log.info(`yarn install in ${installDir}...`);
        let spew = await this._yarn('install', '--no-progress', '--production', '--non-interactive', '--cwd', installDir);
        this._log.info(spew.stdout);
    }

    _node(args) {
        return this._exec(this._nodeExe, args);
    }

    _yarn(...args) {
        args.unshift(path.join('node_modules', 'yarn', 'bin', 'yarn.js'));
        return this._exec(this._nodeExe, args);
    }

    async _exec(exe, args) {
        return execFile(exe, args);
    }
}
