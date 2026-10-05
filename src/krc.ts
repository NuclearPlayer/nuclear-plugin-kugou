import type {
  LineAnnotation,
  SyncedLyricsLine,
  TimedLyricsSegment,
  WordSyncedLyrics,
} from '@nuclearplayer/plugin-sdk';

import { parseLanguageTag } from './language-tag';

type KrcLine = SyncedLyricsLine<TimedLyricsSegment>;


const parseWords = (body: string, lineStartMs: number): TimedLyricsSegment[] =>
  [...body.matchAll(/<(\d+),(\d+),\d+>([^<]*)/g)].map(([, offsetMs, durationMs, text]) => {
    const startMs = lineStartMs + Number(offsetMs);
    return { text, startMs, endMs: startMs + Number(durationMs) };
  });

const parseSegments = (
  body: string,
  startMs: number,
  endMs: number,
): TimedLyricsSegment[] => {
  const words = parseWords(body, startMs);
  if (words.length === 0) {
    return [{ text: body, startMs, endMs }];
  }
  return words;
};

const parseLine = (row: string): KrcLine[] => {
  const match = row.match(/^\[(\d+),(\d+)\](.*)$/);
  if (!match) {
    return [];
  }
  const [, lineStartMs, lineDurationMs, body] = match;
  const startMs = Number(lineStartMs);
  const endMs = startMs + Number(lineDurationMs);
  return [{ startMs, endMs, segments: parseSegments(body, startMs, endMs) }];
};

const findAnnotations = (rows: string[]): LineAnnotation[][] => {
  const languageTag = rows
    .map((row) => row.match(/^\[language:([^\]]*)\]$/))
    .find((match) => match !== null);
  if (!languageTag) {
    return [];
  }
  return parseLanguageTag(languageTag[1]);
};

const withAnnotations = (
  line: KrcLine,
  annotations: LineAnnotation[] = [],
): KrcLine => {
  if (annotations.length === 0) {
    return line;
  }
  return { ...line, annotations };
};

const hasText = ({ segments }: KrcLine): boolean =>
  segments.some(({ text }) => text.trim().length > 0);

const lineText = ({ segments }: KrcLine): string =>
  segments.map(({ text }) => text).join('');

const isCredit = (line: KrcLine, index: number): boolean => {
  const text = lineText(line);
  const isTitle = index === 0 && text.includes(' - ');
  return isTitle || text.includes('：');
};

const dropLeadingCredits = (lines: KrcLine[]): KrcLine[] => {
  const firstLyricIndex = lines.findIndex((line, index) => !isCredit(line, index));
  if (firstLyricIndex === -1) {
    return [];
  }
  return lines.slice(firstLyricIndex);
};

export const parseKrc = (krc: string): WordSyncedLyrics => {
  const rows = krc.split(/\r?\n/);
  const annotations = findAnnotations(rows);
  const lines = dropLeadingCredits(
    rows
      .flatMap(parseLine)
      .map((line, index) => withAnnotations(line, annotations[index]))
      .filter(hasText),
  );

  return { type: 'wordSynced', metadata: {}, sections: [{ lines }] };
};
