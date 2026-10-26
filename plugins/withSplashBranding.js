// Adds "לוח עברי" at the bottom of the Android 12+ system splash (approved option 3, PLAN.md).
// expo-splash-screen has no branding option, so this sets android:windowSplashScreenBrandingImage
// on its theme and copies the images (600x240 px = 200x80 dp at xxhdpi, light and night).
const fs = require('fs');
const path = require('path');
const { withAndroidStyles, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const NAME = 'splash_branding';

function withBrandingImages(config, { light, dark }) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      for (const [dir, src] of [['drawable-xxhdpi', light], ['drawable-night-xxhdpi', dark]]) {
        fs.mkdirSync(path.join(res, dir), { recursive: true });
        fs.copyFileSync(path.join(cfg.modRequest.projectRoot, src), path.join(res, dir, `${NAME}.png`));
      }
      return cfg;
    },
  ]);
}

function withBrandingStyle(config) {
  return withAndroidStyles(config, (cfg) => {
    cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
      add: true,
      parent: { name: 'Theme.App.SplashScreen', parent: 'Theme.SplashScreen' },
      name: 'android:windowSplashScreenBrandingImage',
      value: `@drawable/${NAME}`,
    });
    return cfg;
  });
}

module.exports = function withSplashBranding(config, props) {
  return withBrandingStyle(withBrandingImages(config, props));
};
