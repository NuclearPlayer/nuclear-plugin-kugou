import type { LineAnnotation } from '@nuclearplayer/plugin-sdk';

import { base64ToBytes } from './base64';

type KugouLanguageContent = {
  type: number;
  lyricContent: string[][];
};

type KugouLanguage = {
  content: KugouLanguageContent[];
};

type AnnotationKind = Pick<LineAnnotation, 'type' | 'language'>;

const ANNOTATION_KINDS: Record<number, AnnotationKind> = {
  0: { type: 'romanization', language: 'und-Latn' },
  1: { type: 'translation', language: 'zh-Hans' },
};

const decodeLanguage = (base64: string): KugouLanguage =>
  JSON.parse(new TextDecoder().decode(base64ToBytes(base64)));

const annotationAt =
  (lineIndex: number) =>
  ({ type, lyricContent }: KugouLanguageContent): LineAnnotation[] => {
    const kind = ANNOTATION_KINDS[type];
    const text = (lyricContent[lineIndex] ?? []).join('').trim();
    if (!kind || text.length === 0) {
      return [];
    }
    return [{ ...kind, text }];
  };

const annotationsPerLine = ({ content }: KugouLanguage): LineAnnotation[][] => {
  const lineCount = Math.max(
    0,
    ...content.map(({ lyricContent }) => lyricContent.length),
  );
  return Array.from({ length: lineCount }, (_, lineIndex) =>
    content.flatMap(annotationAt(lineIndex)),
  );
};

export const parseLanguageTag = (base64: string): LineAnnotation[][] => {
  try {
    return annotationsPerLine(decodeLanguage(base64));
  } catch {
    return [];
  }
};
