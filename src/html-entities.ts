export const decodeHtmlEntities = (text: string): string =>
  new DOMParser().parseFromString(text, 'text/html').documentElement.textContent ?? '';
