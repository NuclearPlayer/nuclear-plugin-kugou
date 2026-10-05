import type {
  LyricsProvider,
  NuclearPluginAPI,
} from '@nuclearplayer/plugin-sdk';

import { KugouClient } from './client';
import { config } from './config';
import { decryptKrc } from './decrypt-krc';
import { parseKrc } from './krc';

const keywordOf = (title: string, artist?: string): string => {
  if (artist) {
    return `${artist} - ${title}`;
  }
  return title;
};

export const createLyricsProvider = (api: NuclearPluginAPI): LyricsProvider => {
  const client = new KugouClient(api.Http.fetch);

  return {
    id: config.providerId,
    kind: 'lyrics',
    name: config.providerName,

    async getLyrics(track) {
      const response = await client.search({
        keyword: keywordOf(track.title, track.artists[0]?.name),
        durationMs: track.durationMs,
      });
      const hit = response.candidates.at(0);
      if (!hit) {
        return undefined;
      }
      const content = await client.download(hit);
      return parseKrc(await decryptKrc(content));
    },
  };
};
