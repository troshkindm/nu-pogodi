import filmSvg from './film.svg?raw';
import segmentsSvg from './segments.svg?raw';

export interface ArtPath {
  id: string;
  d: string;
  fill?: string;
}

const PATH_TAG = /<path\s[^>]*\/>/g;
const ATTRIBUTES = { id: /\sid="([^"]*)"/, d: /\sd="([^"]*)"/, fill: /\sfill="([^"]*)"/ };
const attribute = (tag: string, name: keyof typeof ATTRIBUTES) => tag.match(ATTRIBUTES[name])?.[1];

export function parsePaths(svg: string): ArtPath[] {
  return (svg.match(PATH_TAG) ?? []).map((tag) => ({
    id: attribute(tag, 'id') ?? '',
    d: attribute(tag, 'd') ?? '',
    fill: attribute(tag, 'fill'),
  }));
}

export const SEGMENT_PATHS: ReadonlyMap<string, string> = new Map(
  parsePaths(segmentsSvg).map(({ id, d }) => [id.replace(/^seg-/, ''), d]),
);
export const FILM_PATHS: readonly ArtPath[] = parsePaths(filmSvg);
export const SEGMENT_INK = '#141310';
export const LCD_VIEWBOX = { width: 1570, height: 989 };
