import { PAPER_SOUND_CONFIG } from '../game/config';

export type PaperSound = 'turn' | 'cover' | 'lift' | 'place';

interface Rustle {
  from: number;
  to: number;
  duration: number;
  level: number;
  crackle: number;
}

const SILENCE = 0.0001;
const CRACKLE_STEP = 0.018;

const filteredNoise = (context: AudioContext, noise: AudioBuffer, type: BiquadFilterType, frequency: number) => {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  source.buffer = noise;
  source.loop = true;
  filter.type = type;
  filter.frequency.value = frequency;
  source.connect(filter);
  return { source, filter };
};

function rustle(context: AudioContext, noise: AudioBuffer, spec: Rustle, start: number) {
  const { source, filter } = filteredNoise(context, noise, 'bandpass', spec.from);
  filter.Q.value = 0.8;
  filter.frequency.exponentialRampToValueAtTime(spec.to, start + spec.duration);
  const gain = context.createGain();
  gain.gain.setValueAtTime(SILENCE, start);
  gain.gain.exponentialRampToValueAtTime(spec.level, start + spec.duration * 0.15);
  for (let t = spec.duration * 0.15; t < spec.duration * 0.85; t += CRACKLE_STEP)
    gain.gain.setValueAtTime(spec.level * (1 - spec.crackle * Math.random()), start + t);
  gain.gain.exponentialRampToValueAtTime(SILENCE, start + spec.duration);
  filter.connect(gain).connect(context.destination);
  source.start(start, Math.random() * 0.5);
  source.stop(start + spec.duration + 0.02);
}

interface Burst {
  cutoff: number;
  level: number;
  start: number;
  length: number;
}

function burst(context: AudioContext, noise: AudioBuffer, { cutoff, level, start, length }: Burst) {
  const { source, filter } = filteredNoise(context, noise, 'lowpass', cutoff);
  const gain = context.createGain();
  gain.gain.setValueAtTime(SILENCE, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.004);
  gain.gain.exponentialRampToValueAtTime(SILENCE, start + length);
  filter.connect(gain).connect(context.destination);
  source.start(start, Math.random() * 0.5);
  source.stop(start + length + 0.02);
}

function thump(context: AudioContext, noise: AudioBuffer, start: number) {
  const { body, duration, level, cutoff } = PAPER_SOUND_CONFIG.place;
  const knock = context.createOscillator();
  const gain = context.createGain();
  knock.frequency.setValueAtTime(body * 1.3, start);
  knock.frequency.exponentialRampToValueAtTime(body, start + duration);
  gain.gain.setValueAtTime(SILENCE, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(SILENCE, start + duration);
  knock.connect(gain).connect(context.destination);
  knock.start(start);
  knock.stop(start + duration + 0.02);
  burst(context, noise, { cutoff, level: level * 0.7, start, length: duration * 0.6 });
}

export function playPaper(context: AudioContext, noise: AudioBuffer, sound: PaperSound) {
  const start = context.currentTime + 0.005;
  if (sound === 'place') {
    thump(context, noise, start);
    return;
  }
  const spec = PAPER_SOUND_CONFIG[sound];
  rustle(context, noise, spec, start);
  if (sound === 'lift') return;
  const { cutoff, duration, level } = PAPER_SOUND_CONFIG.flap;
  burst(context, noise, { cutoff, level: spec.level * level, start: start + spec.duration * 0.8, length: duration });
}
