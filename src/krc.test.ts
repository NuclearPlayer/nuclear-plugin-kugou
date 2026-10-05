import { describe, expect, it } from 'vitest';

import { parseKrc } from './krc';
import yoruNiKakeruKrc from './test/fixtures/yoru-ni-kakeru.krc?raw';

type LanguageContent = {
  type: number;
  language: number;
  lyricContent: string[][];
};

const languageTag = (content: LanguageContent[]): string => {
  const bytes = new TextEncoder().encode(JSON.stringify({ content, version: 1 }));
  return `[language:${btoa(String.fromCharCode(...bytes))}]`;
};

describe('parseKrc', () => {
  it('maps word-timed lines to word-synced lyrics with absolute times', () => {
    const krc = [
      '[1000,2500]<0,500,0>Can\'t <500,1000,0>take <1500,1000,0>it',
      '[4000,1000]<0,1000,0>Reckoner',
    ].join('\n');

    expect(parseKrc(krc)).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 1000,
              endMs: 3500,
              segments: [
                { text: "Can't ", startMs: 1000, endMs: 1500 },
                { text: 'take ', startMs: 1500, endMs: 2500 },
                { text: 'it', startMs: 2500, endMs: 3500 },
              ],
            },
            {
              startMs: 4000,
              endMs: 5000,
              segments: [{ text: 'Reckoner', startMs: 4000, endMs: 5000 }],
            },
          ],
        },
      ],
    });
  });

  it('skips metadata tags', () => {
    const krc = [
      '[id:$00000000]',
      '[ar:Radiohead]',
      '[ti:Reckoner]',
      '[total:290246]',
      '[offset:0]',
      '[100,200]<0,200,0>Reckoner',
    ].join('\r\n');

    expect(parseKrc(krc)).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 100,
              endMs: 300,
              segments: [{ text: 'Reckoner', startMs: 100, endMs: 300 }],
            },
          ],
        },
      ],
    });
  });

  it('makes one segment spanning the line when the line has no timed words', () => {
    expect(parseKrc('[2000,3000]Dancing for your pleasure')).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 2000,
              endMs: 5000,
              segments: [
                { text: 'Dancing for your pleasure', startMs: 2000, endMs: 5000 },
              ],
            },
          ],
        },
      ],
    });
  });

  it('drops lines without text', () => {
    const krc = [
      '[0,1000]<0,500,0> <500,500,0> ',
      '[1000,1000]',
      '[2000,1000]<0,1000,0>Reckoner',
    ].join('\n');

    expect(parseKrc(krc)).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 2000,
              endMs: 3000,
              segments: [{ text: 'Reckoner', startMs: 2000, endMs: 3000 }],
            },
          ],
        },
      ],
    });
  });

  it('drops the title line and the credit lines before the first lyric line', () => {
    const krc = [
      '[0,490]<0,490,0>夜に駆ける - YOASOBI',
      '[491,112]<0,112,0>词：Ayase',
      '[604,188]<0,188,0>Written by：Daryl Hall/John Oates',
      '[1057,5065]<0,5065,0>沈むように',
    ].join('\n');

    expect(parseKrc(krc)).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 1057,
              endMs: 6122,
              segments: [{ text: '沈むように', startMs: 1057, endMs: 6122 }],
            },
          ],
        },
      ],
    });
  });

  it('keeps lines with a dash or a colon after the first lyric line', () => {
    const krc = [
      '[1000,1000]<0,1000,0>Reckoner',
      '[2000,1000]<0,1000,0>Take it with you - Radiohead',
      '[3000,1000]<0,1000,0>他说：再见',
    ].join('\n');

    expect(parseKrc(krc)).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 1000,
              endMs: 2000,
              segments: [{ text: 'Reckoner', startMs: 1000, endMs: 2000 }],
            },
            {
              startMs: 2000,
              endMs: 3000,
              segments: [
                { text: 'Take it with you - Radiohead', startMs: 2000, endMs: 3000 },
              ],
            },
            {
              startMs: 3000,
              endMs: 4000,
              segments: [{ text: '他说：再见', startMs: 3000, endMs: 4000 }],
            },
          ],
        },
      ],
    });
  });

  it('adds translations and romanizations from the language tag to the lyric line at the same index', () => {
    const krc = [
      '[ti:夜に駆ける]',
      languageTag([
        {
          type: 1,
          language: 0,
          lyricContent: [[' '], ['宛如沉溺般'], ['']],
        },
        {
          type: 0,
          language: 0,
          lyricContent: [[' '], ['shi zu ', 'mu '], ['yo ru ', 'ni ']],
        },
      ]),
      '[0,500]<0,500,0> ',
      '[1000,1000]<0,500,0>沈<500,500,0>む',
      '[3000,1000]<0,600,0>夜<600,400,0>に',
    ].join('\n');

    expect(parseKrc(krc)).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 1000,
              endMs: 2000,
              segments: [
                { text: '沈', startMs: 1000, endMs: 1500 },
                { text: 'む', startMs: 1500, endMs: 2000 },
              ],
              annotations: [
                { type: 'translation', language: 'zh-Hans', text: '宛如沉溺般' },
                { type: 'romanization', language: 'und-Latn', text: 'shi zu mu' },
              ],
            },
            {
              startMs: 3000,
              endMs: 4000,
              segments: [
                { text: '夜', startMs: 3000, endMs: 3600 },
                { text: 'に', startMs: 3600, endMs: 4000 },
              ],
              annotations: [
                { type: 'romanization', language: 'und-Latn', text: 'yo ru ni' },
              ],
            },
          ],
        },
      ],
    });
  });

  it('ignores a language tag that does not hold base64 JSON', () => {
    const krc = ['[language:bm90IGpzb24=]', '[0,1000]<0,1000,0>Reckoner'].join('\n');

    expect(parseKrc(krc)).toEqual({
      type: 'wordSynced',
      metadata: {},
      sections: [
        {
          lines: [
            {
              startMs: 0,
              endMs: 1000,
              segments: [{ text: 'Reckoner', startMs: 0, endMs: 1000 }],
            },
          ],
        },
      ],
    });
  });

  it('parses a decoded Kugou KRC file', () => {
    const [firstLyricLine, , , sayonaraLine] = parseKrc(yoruNiKakeruKrc).sections[0].lines;

    expect(firstLyricLine).toEqual({
      startMs: 1671,
      endMs: 3438,
      segments: [
        { text: '沈', startMs: 1671, endMs: 2140 },
        { text: 'む', startMs: 2140, endMs: 2505 },
        { text: 'よ', startMs: 2505, endMs: 2860 },
        { text: 'う', startMs: 2860, endMs: 3124 },
        { text: 'に', startMs: 3124, endMs: 3438 },
      ],
      annotations: [
        { type: 'translation', language: 'zh-Hans', text: '宛如沉溺般' },
        { type: 'romanization', language: 'und-Latn', text: 'shi zu mu yo u ni' },
      ],
    });
    expect(sayonaraLine).toEqual({
      startMs: 31776,
      endMs: 34265,
      segments: [
        { text: 'さ', startMs: 31776, endMs: 32131 },
        { text: 'よ', startMs: 32131, endMs: 32299 },
        { text: 'な', startMs: 32299, endMs: 32613 },
        { text: 'ら', startMs: 32613, endMs: 32878 },
        { text: 'だ', startMs: 32878, endMs: 33181 },
        { text: 'け', startMs: 33181, endMs: 33444 },
        { text: 'だ', startMs: 33444, endMs: 33697 },
        { text: 'っ', startMs: 33697, endMs: 33960 },
        { text: 'た', startMs: 33960, endMs: 34265 },
      ],
      annotations: [
        { type: 'translation', language: 'zh-Hans', text: '你只留下了一句再见' },
        { type: 'romanization', language: 'und-Latn', text: "sa yo na ra da ke da 't ta" },
      ],
    });
  });
});
