export type KugouSearchCandidate = {
  id: string;
  accesskey: string;
  singer: string;
  song: string;
  duration: number;
};

export type KugouSearchResponse = {
  status: number;
  candidates: KugouSearchCandidate[];
};

export type KugouDownloadResponse = {
  status: number;
  fmt: string;
  content: string;
};

export type KugouSearchParams = {
  keyword: string;
  durationMs?: number;
};

export type KugouLyricsKey = Pick<KugouSearchCandidate, 'id' | 'accesskey'>;
