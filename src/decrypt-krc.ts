import { base64ToBytes } from './base64';

const KRC_KEY = new Uint8Array([
  0x40, 0x47, 0x61, 0x77, 0x5e, 0x32, 0x74, 0x47, 0x51, 0x36, 0x31, 0x2d, 0xce,
  0xd2, 0x6e, 0x69,
]);
const KRC_HEADER_LENGTH = 4;

const xorWithKey = (bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> =>
  bytes.map((byte, index) => byte ^ KRC_KEY[index % KRC_KEY.length]);

const inflate = (bytes: Uint8Array<ArrayBuffer>): Promise<string> =>
  new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')),
  ).text();

export const decryptKrc = (content: string): Promise<string> =>
  inflate(xorWithKey(base64ToBytes(content).slice(KRC_HEADER_LENGTH)));
