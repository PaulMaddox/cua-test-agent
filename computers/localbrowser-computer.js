import { chromium } from 'playwright';
import { Computer } from './computer.js';
import path from 'path';
import { LOG } from '../logger.js';

export class LocalBrowserComputer extends Computer {

    constructor(startUrl, headless = false, resultsPath) {
        // Initialize Playwright browser and context
        super(startUrl, headless);
        this.resultsPath = resultsPath;
    }

    async start() {
        super.start();
        // Spawn a new Chromium browser instance
        this.browser = await chromium.launch({
            headless: this.headless,
            env: { DISPLAY: ':0' },
            args: [
                '--disable-extensions',
                '--disable-file-system',
                `--window-size=${this.displayWidth},${this.displayHeight}`
            ]
        });

        // Create a new browser context
        this.context = await this.browser.newContext({
            recordHar: { path: path.join(this.outputPath, 'playwright.har'), content: "embed" },
            viewport: { width: this.displayWidth, height: this.displayHeight },
            ignoreHTTPSErrors: true,
            bypassCSP: true
        });

        this.page = await this.context.newPage();
        this.page.goto(this.startUrl || 'http://google.com');
        this.page.waitForLoadState('load');

        LOG.ok('[LocalBrowserComputer] Browser started successfully');
    }

    async stop() {
        super.stop();
        await this.context.close();
        await this.browser.close();
        LOG.error('[LocalBrowserComputer] Browser closed');
    }

    async handleAction(action) {
        super.handleAction(action);

        const { x, y, button, path, scroll_x, scroll_y, text, keys, url } = action;

        try {
            switch (action.type) {
                case 'click':
                    LOG.info(`[LocalBrowserComputer] Clicking at (${x}, ${y}) with button ${button || 'left'}`);
                    await this.page.mouse.click(x, y, { button: button || 'left' });
                    break;
                case 'double_click':
                    LOG.info(`[LocalBrowserComputer] Double-clicking at (${x}, ${y}) with button ${button || 'left'}`);
                    await this.page.mouse.dblclick(x, y, { button: button || 'left' });
                    break;
                case 'move':
                    LOG.info(`[LocalBrowserComputer] Moving mouse to (${x}, ${y})`);
                    await this.page.mouse.move(x, y);
                    break;
                case 'drag':
                    LOG.info(`[LocalBrowserComputer] Dragging along path ${path}`);
                    if (Array.isArray(path) && path.length > 0) {
                        await this.page.mouse.move(path[0].x, path[0].y);
                        for (let i = 1; i < path.length; i++) {
                            await this.page.mouse.down();
                            await this.page.mouse.move(path[i].x, path[i].y);
                            await this.page.mouse.up();
                        }
                    }
                    break;
                case 'scroll':
                    LOG.info(`[LocalBrowserComputer] Scrolling by (${scroll_x}, ${scroll_y})`);
                    await this.page.mouse.wheel(scroll_x, scroll_y);
                    break;
                case 'type':
                    LOG.info(`[LocalBrowserComputer] Typing text: ${text}`);
                    await this.page.keyboard.type(text);
                    break;
                case 'keypress':
                    LOG.info(`[LocalBrowserComputer] Pressing keys: ${keys.join(', ')}`);
                    const mappedKeys = keys.map(key => this.keyMap[key.toUpperCase()] || key);
                    const modifiers = mappedKeys.filter(key => this.modifierKeys.has(key));
                    const normalKeys = mappedKeys.filter(key => !this.modifierKeys.has(key));
                    if (
                        (mappedKeys[0] === "Meta" && mappedKeys[1] === "[") ||
                        (mappedKeys[0] === "Alt" && mappedKeys[1] === "ArrowLeft")
                    ) {
                        await this.page.goBack();
                        break;
                    }
                    // Hold down modifier keys
                    for (const key of modifiers) {
                        await this.page.keyboard.down(key);
                    }

                    // Press normal keys
                    for (const key of normalKeys) {
                        await this.page.keyboard.press(key);
                    }

                    // Release modifier keys
                    for (const key of modifiers) {
                        await this.page.keyboard.up(key);
                    }

                    break;
                case 'wait':
                    LOG.info(`[LocalBrowserComputer] Waiting for 1000ms`);
                    await this.page.waitForTimeout(1000);
                    break;
                case 'goto':
                    LOG.info(`[LocalBrowserComputer] Navigating to URL: ${url}`);
                    await this.page.goto(url);
                    break;
                case 'back':
                    LOG.info(`[LocalBrowserComputer] Navigating back`);
                    await this.page.goBack();
                    break;
                case 'forward':
                    LOG.info(`[LocalBrowserComputer] Navigating forward`);
                    await this.page.goForward();
                    break;
                case 'screenshot':
                    // Do nothing: we send a screenshot with every response anyway
                    break;
                default:
                    LOG.error(`[LocalBrowserComputer] Unknown computer input type: ${action.type}`);
            }
        } catch (error) {
            LOG.error(`[LocalBrowserComputer] Error handling action: ${error.message}`);
            throw error;
        }

    }

    async screenshot() {
        super.screenshot();
        const screenshotBuffer = await this.page.screenshot({ fullPage: true });
        // Save the screenshot to the results path if specified
        if (this.resultsPath) {
            const screenshotPath = path.join(this.resultsPath, `screenshot-${Date.now()}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            LOG.info(`[LocalBrowserComputer] Screenshot saved to ${screenshotPath}`);
        }
        return screenshotBuffer.toString('base64');
    }

}
