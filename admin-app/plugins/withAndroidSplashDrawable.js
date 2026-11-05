const fs = require('node:fs');
const path = require('node:path');
const { withAndroidStyles } = require('@expo/config-plugins');

module.exports = function withAndroidSplashDrawable(config) {
  return withAndroidStyles(config, (config) => {
    const source = path.resolve(config.modRequest.projectRoot, '..', 'assets', 'splashscreen_logo.xml');
    const destination = path.join(
      config.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'res',
      'drawable',
      'splashscreen_logo.xml',
    );

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    return config;
  });
};
