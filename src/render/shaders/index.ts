import cameraMain from './camera/main.glsl?raw';
import common from './common.glsl?raw';
import grain from './surface/grain.glsl?raw';
import keys from './surface/keys.glsl?raw';
import lcd from './surface/lcd.glsl?raw';
import light from './surface/light.glsl?raw';
import surfaceMain from './surface/main.glsl?raw';
import relief from './surface/relief.glsl?raw';
import uniforms from './surface/uniforms.glsl?raw';
import wear from './surface/wear.glsl?raw';
import vertex from './vertex.glsl?raw';

const header = (defines: readonly string[]) =>
  ['precision highp float;', ...defines.map((define) => `#define ${define}`)].join('\n');

export const VERTEX_SHADER = vertex;

export const surfaceShader = (defines: readonly string[]) =>
  [header(defines), uniforms, common, relief, keys, grain, wear, light, lcd, surfaceMain].join('\n');

export const cameraShader = (defines: readonly string[]) => [header(defines), common, cameraMain].join('\n');
