import type { FetchFunction } from '@nuclearplayer/plugin-sdk';

import { config } from './config';
import type {
  KugouDownloadResponse,
  KugouLyricsKey,
  KugouSearchParams,
  KugouSearchResponse,
} from './kugou-types';

const KUGOU_OK = 200;
const CLIENT_PARAMS = { ver: '1', client: 'pc' };

const searchParamsOf = ({
  keyword,
  durationMs,
}: KugouSearchParams): Record<string, string> => {
  const params = { ...CLIENT_PARAMS, man: 'yes', keyword };
  if (durationMs === undefined) {
    return params;
  }
  return { ...params, duration: String(durationMs) };
};

export class KugouClient {
  constructor(private readonly fetch: FetchFunction) {}

  search(params: KugouSearchParams): Promise<KugouSearchResponse> {
    return this.request<KugouSearchResponse>('/search', searchParamsOf(params));
  }

  async download({ id, accesskey }: KugouLyricsKey): Promise<string> {
    const response = await this.request<KugouDownloadResponse>('/download', {
      ...CLIENT_PARAMS,
      id,
      accesskey,
      fmt: 'krc',
      charset: 'utf8',
    });
    if (!response.content) {
      throw new Error(`Kugou returned no lyrics for ${id}`);
    }
    return response.content;
  }

  private async request<T extends { status: number }>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, config.apiBase);
    url.search = new URLSearchParams(params).toString();
    const response = await this.fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Kugou API error: ${response.status} for ${path}`);
    }
    const body = (await response.json()) as T;
    if (body.status !== KUGOU_OK) {
      throw new Error(`Kugou API error: status ${body.status} for ${path}`);
    }
    return body;
  }
}
