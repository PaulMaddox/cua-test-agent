/**
 * Stealth adapter for Playwright implementing browser fingerprint evasion
 */

import { LOG } from '../logger.js';

/**
 * Apply stealth mode to a Playwright page
 * @param {import('playwright').Page} page - The Playwright page
 */
export async function applyStealthMode(page) {
  
  // Apply common stealth techniques through script injection
  await page.addInitScript(() => {
    // Hide webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Modify user agent to remove headless indicators
    const userAgent = navigator.userAgent;
    if (userAgent.includes('HeadlessChrome')) {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => userAgent.replace('HeadlessChrome', 'Chrome'),
      });
    }
    
    // Add plugins to navigator
    if (navigator.plugins.length === 0) {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5].map(() => ({
          name: 'Plugin',
          description: 'Plugin desc',
          filename: 'plugin.dll',
        })),
      });
    }
    
    // Add language preferences
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    
    // Modify permissions API
    if (navigator.permissions) {
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications' || parameters.name === 'push') {
          return Promise.resolve({ state: 'prompt', onchange: null });
        }
        return originalQuery.call(navigator.permissions, parameters);
      };
    }
    
    // Fake WebGL vendor and renderer
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
      }
      if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
      }
      return getParameter.call(this, parameter);
    };
  });

  // Additional stealth configurations
  await page.route('**/*', async (route) => {
    const request = route.request();
    
    // Modify request headers to appear more like a regular browser
    const headers = request.headers();
    if (headers['accept']) {
      headers['accept'] = headers['accept']
        .replace('application/csp-report', '')
        .replace(',', ', ');
    }
    
    await route.continue({ headers });
  });
  
}