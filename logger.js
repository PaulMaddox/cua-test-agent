import { mkdir, appendFile } from "fs/promises";
import chalk from "chalk";
import fs from "fs";
import path from 'path';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Log {
    constructor(logLevel = 'info') {
        this.logLevel = LEVELS[logLevel] !== undefined ? logLevel : 'info';
        this.logPath = null;
        this.logFile = null;
    }

    setLogPath(logPath) {
        this.logPath = logPath;
        this.logFile = path.join(logPath, 'cua-test.log');
    }

    async _appendToFile(line) {
        if (!this.logFile) return;
        await mkdir(path.dirname(this.logFile), { recursive: true });
        await appendFile(this.logFile, line + '\n', 'utf-8');
    }

    async debug(message) {
        if (LEVELS[this.logLevel] <= LEVELS.debug) {
            console.log(chalk.gray(message));
        }
        const time = new Date().toISOString();
        let timestamped = (`[${time}] [DEBUG] ${message}`);
        await this._appendToFile(timestamped);
    }

    async info(message) {
        if (LEVELS[this.logLevel] <= LEVELS.info) {
            console.log(chalk.blue(message));
        }
        const time = new Date().toISOString();
        let timestamped = (`[${time}] [INFO] ${message}`);
        await this._appendToFile(timestamped);
    }

    async ok(message) {
        console.log(chalk.green(message));
        const time = new Date().toISOString();
        let timestamped = (`[${time}] [SUCCESS] ${message}`);
        await this._appendToFile(timestamped);
    }

    async warn(message) {
        if (LEVELS[this.logLevel] <= LEVELS.warn) {
            console.log(chalk.yellow(message));
        }
        const time = new Date().toISOString();
        let timestamped = (`[${time}] [WARN] ${message}`);
        await this._appendToFile(timestamped);
    }

    async error(message) {
        if (LEVELS[this.logLevel] <= LEVELS.error) {
            console.log(chalk.red(message));
        }
        const time = new Date().toISOString();
        let timestamped = (`[${time}] [ERROR] ${message}`);
        await this._appendToFile(timestamped);
    }

    async screenshot(screenshotBuffer) {
        const screenshotPath = path.join(this.logPath, `screenshot-${Date.now()}.png`);
        fs.writeFileSync(screenshotPath, screenshotBuffer);
    }

}

export const LOG = new Log('info');
export default LOG;
