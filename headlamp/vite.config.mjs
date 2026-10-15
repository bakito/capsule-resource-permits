import { defineConfig } from 'vite';

import headlampConfig from './node_modules/@kinvolk/headlamp-plugin/config/vite.config.mjs';

const headlampGlobals = headlampConfig.build.rollupOptions.output.globals;

function capsulePluginGlobals(request) {
  // RJSF imports MUI components through paths such as
  // `@mui/material/IconButton/index.js`. Headlamp exposes those components on
  // pluginLib.MuiMaterial, while the stock plugin builder currently turns the
  // path into the invalid `IconButtonindex.js` property.
  if (request.startsWith('@mui/material/')) {
    const submodule = request
      .slice('@mui/material/'.length)
      .replace(/\/index(?:\.js)?$/, '')
      .replace(/\.js$/, '')
      .replace(/\/+/g, '');

    // Headlamp spreads the exports from @mui/material onto MuiMaterial. It
    // does not expose a nested `utils` object, so named utility imports such
    // as createSvgIcon must resolve against the root shared module.
    if (submodule === 'utils') {
      return 'pluginLib.MuiMaterial';
    }

    return `pluginLib.MuiMaterial.${submodule}`;
  }

  // The stock external matcher for `lodash` also matches `lodash-es`. RJSF
  // uses lodash-es submodules, and Headlamp already exposes the equivalent
  // functions through pluginLib.Lodash.
  if (request.startsWith('lodash-es/')) {
    const submodule = request.slice('lodash-es/'.length).replace(/\.js$/, '').replace(/\/+/g, '');
    return `pluginLib.Lodash.${submodule}`;
  }

  return headlampGlobals(request);
}

export default defineConfig({
  ...headlampConfig,
  build: {
    ...headlampConfig.build,
    rollupOptions: {
      ...headlampConfig.build.rollupOptions,
      output: {
        ...headlampConfig.build.rollupOptions.output,
        globals: capsulePluginGlobals,
      },
    },
  },
});
