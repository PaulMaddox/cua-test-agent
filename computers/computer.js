import chalk from 'chalk';
import process from 'process';
import { LOG } from '../logger.js';

export class Computer {

    constructor(startUrl, headless, outputPath, displayWidth, displayHeight) {
        this.startUrl = startUrl || 'https://google.com';
        this.headless = headless || false;
        this.outputPath = outputPath || './output';
        this.displayWidth = displayWidth || 800;
        this.displayHeight = displayHeight || 600;
        this.modifierKeys = new Set(["Control", "Shift", "Alt", "Meta"]);
        this.keyMap = {
            ENTER: "Enter",
            ARROWLEFT: "ArrowLeft",
            ARROWRIGHT: "ArrowRight",
            ARROWUP: "ArrowUp",
            ARROWDOWN: "ArrowDown",
            ALT: "Alt",
            CTRL: "Control",
            SHIFT: "Shift",
            CMD: "Meta" // macOS Command key
        };
        this.osName = this.getOSName();
    }

    async start() {
        LOG.ok(`[Computer] Starting computer with resolution ${this.displayWidth}x${this.displayHeight} (headless: ${this.headless})...`);
    }

    async stop() {
        LOG.error(`[Computer] Stopping computer...`);
    }

    async handleAction(action) {
        LOG.info(`[Computer] Handling action: ${JSON.stringify(action, null, 2)}`);
    }

    async screenshot() {
        LOG.info(`[Computer] Taking screenshot (${this.displayWidth}x${this.displayHeight})`);
    }

    getOSName() {
        const osType = process.platform;
        if (osType === "darwin") return "macOS";
        if (osType === "win32") return "Windows";
        return "Linux";
    }

}