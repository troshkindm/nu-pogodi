import bookOpen from '@fluentui/svg-icons/icons/book_open_20_regular.svg?raw';
import dismiss from '@fluentui/svg-icons/icons/dismiss_20_regular.svg?raw';
import maximize from '@fluentui/svg-icons/icons/full_screen_maximize_20_regular.svg?raw';
import minimize from '@fluentui/svg-icons/icons/full_screen_minimize_20_regular.svg?raw';
import lightbulb from '@fluentui/svg-icons/icons/lightbulb_20_regular.svg?raw';
import language from '@fluentui/svg-icons/icons/local_language_20_regular.svg?raw';
import options from '@fluentui/svg-icons/icons/options_20_regular.svg?raw';
import speaker from '@fluentui/svg-icons/icons/speaker_2_20_regular.svg?raw';
import speakerMute from '@fluentui/svg-icons/icons/speaker_mute_20_regular.svg?raw';

const PATH_DATA = /\sd="([^"]+)"/g;

const pathsOf = (svg: string) => [...svg.matchAll(PATH_DATA)].map((match) => match[1]);

const ICONS = {
  bookOpen: pathsOf(bookOpen),
  dismiss: pathsOf(dismiss),
  maximize: pathsOf(maximize),
  minimize: pathsOf(minimize),
  language: pathsOf(language),
  lightbulb: pathsOf(lightbulb),
  options: pathsOf(options),
  speaker: pathsOf(speaker),
  speakerMute: pathsOf(speakerMute),
};

export type IconName = keyof typeof ICONS;

export const Icon = ({ name }: { name: IconName }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    {ICONS[name].map((d) => (
      <path key={d.slice(0, 16)} d={d} />
    ))}
  </svg>
);
