const { configure } = require('quasar/wrappers');
const path = require('path');
const EnvParser = require('./variables/parser')();

module.exports = configure(() => ({
  eslint: {
    warnings: true,
    errors: true,
  },

  boot: [],

  css: ['app.scss', 'tailwind.css'],

  extras: [],

  build: {
    target: {
      browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
      node: 'node16',
    },

    vueRouterMode: 'history',

    env: EnvParser,

    extendViteConf(viteConf) {
      viteConf.resolve.alias['quasar/dist/quasar.sass'] = path.resolve(
        __dirname,
        'src/css/quasar-lite.sass',
      );
      viteConf.build.minify = 'terser';
      viteConf.build.terserOptions = { compress: { passes: 2 }, format: { comments: false } };
    },
  },

  devServer: {
    open: false,
  },

  framework: {
    config: {},

    plugins: ['Notify'],
  },

  animations: ['fadeIn', 'fadeOut'],

  ssr: {
    pwa: false,

    prodPort: 3000,

    middlewares: ['render'],
  },

  pwa: {
    workboxMode: 'generateSW',
    injectPwaMetaTags: true,
    swFilename: 'sw.js',
    manifestFilename: 'manifest.json',
    useCredentialsForManifestTag: false,
  },

  cordova: {},

  capacitor: {
    hideSplashscreen: true,
  },

  electron: {
    inspectPort: 5858,

    bundler: 'packager',

    packager: {},

    builder: {
      appId: 'twodot-quasar-template',
    },
  },

  bex: {
    contentScripts: ['my-content-script'],
  },
}));
