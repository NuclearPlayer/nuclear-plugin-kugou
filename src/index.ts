import type {
  NuclearPlugin,
  NuclearPluginAPI,
} from '@nuclearplayer/plugin-sdk';

import { config } from './config';
import { createLyricsProvider } from './provider';

const plugin: NuclearPlugin = {
  onEnable(api: NuclearPluginAPI) {
    api.Providers.register(createLyricsProvider(api));
  },

  onDisable(api: NuclearPluginAPI) {
    api.Providers.unregister(config.providerId);
  },
};

export default plugin;
