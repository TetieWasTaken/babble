#!/usr/bin/env node

const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  try {
    const bundlePath = path.join(__dirname, 'dist', 'bundle.js');

    const bundleUrl = pathToFileURL(bundlePath).href;

    await import(bundleUrl);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
