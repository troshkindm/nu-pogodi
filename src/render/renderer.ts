import {
  LCD_RECT,
  MAP_SCALE,
  MAP_SIZE,
  PILL_HALF_LENGTH,
  PILL_KEYS,
  ROUND_CAP_RADIUS,
  ROUND_KEYS,
  toMap,
  toViewFraction,
} from './device/geometry';
import type { Point } from './device/geometry';
import { createFullscreenQuad, createProgram } from './gl/program';
import type { Program } from './gl/program';
import {
  createBlankTexture,
  createImageTexture,
  createRenderTarget,
  svgToImage,
  updateTextureRegion,
  uploadTexture,
} from './gl/texture';
import { createSpring, isSettled, stepSpring } from './keySpring';
import type { Spring } from './keySpring';
import { backgroundLayer, printLayer } from './lcd/layers';
import { createSegmentRaster } from './lcd/segmentRaster';
import { LIGHTING } from './lighting';
import type { Vector3 } from './lighting';
import { albedoMap } from './maps/albedo';
import { heightMap } from './maps/height';
import { materialMap } from './maps/material';
import { CAMERA_REACH, FULL_REGION, LCD_REGION, expand, keyRegion, scissorBox } from './regions';
import type { Region } from './regions';
import { definesFor } from './settings';
import type { RenderSettings } from './settings';
import { VERTEX_SHADER, cameraShader, surfaceShader } from './shaders';

export type KeyKind = 'round' | 'pill';
export type { Vector3 };

export interface DeviceRenderer {
  setLit(lit: ReadonlySet<string>): void;
  setPressed(kind: KeyKind, index: number, down: boolean): void;
  setLight(key: Vector3): void;
  setSettings(settings: RenderSettings): Promise<void>;
  dispose(): void;
}

const UNIT = { albedo: 0, height: 1, material: 2, lcd: 3, surface: 4, segments: [5, 6], print: 7 };
const LCD_FADE_MS = 170;
const CAMERA_SEED = 7.3;

type Gl = WebGLRenderingContext;

function webglContext(canvas: HTMLCanvasElement): Gl {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL is not available');
  return gl;
}

async function bakeTextures(gl: Gl, settings: RenderSettings) {
  const layers = [albedoMap(settings.wear), heightMap(), materialMap(), backgroundLayer(), printLayer()];
  const [albedo, height, material, background, print] = await Promise.all(layers.map(svgToImage));
  createImageTexture(gl, UNIT.height, height);
  createImageTexture(gl, UNIT.material, material);
  createImageTexture(gl, UNIT.lcd, background);
  createImageTexture(gl, UNIT.print, print);
  return {
    albedo: createImageTexture(gl, UNIT.albedo, albedo),
    segments: UNIT.segments.map((unit) => createBlankTexture(gl, unit, MAP_SIZE.width, MAP_SIZE.height)),
  };
}

function surfaceProgram(gl: Gl, settings: RenderSettings): Program {
  const program = createProgram(gl, VERTEX_SHADER, surfaceShader(definesFor(settings, 'surface')));
  program.use();
  gl.uniform1i(program.uniform('uAlbedo'), UNIT.albedo);
  gl.uniform1i(program.uniform('uHeight'), UNIT.height);
  gl.uniform1i(program.uniform('uMaterial'), UNIT.material);
  gl.uniform1i(program.uniform('uLcd'), UNIT.lcd);
  gl.uniform1i(program.uniform('uPrint'), UNIT.print);
  gl.uniform2f(program.uniform('uSize'), MAP_SIZE.width, MAP_SIZE.height);
  gl.uniform3fv(program.uniform('uFlash'), LIGHTING.flash);
  gl.uniform3fv(program.uniform('uKeyColor'), LIGHTING.keyColor);
  gl.uniform3fv(program.uniform('uFlashColor'), LIGHTING.flashColor);
  gl.uniform3fv(program.uniform('uAmbient'), LIGHTING.ambient);
  gl.uniform1f(program.uniform('uHeightScale'), LIGHTING.heightScale);
  return program;
}

function cameraProgram(gl: Gl, settings: RenderSettings): Program {
  const program = createProgram(gl, VERTEX_SHADER, cameraShader(definesFor(settings, 'camera')));
  const [left, top] = toViewFraction([LCD_RECT.x1, LCD_RECT.y1]);
  const [right, bottom] = toViewFraction([LCD_RECT.x2, LCD_RECT.y2]);
  program.use();
  gl.uniform1i(program.uniform('uImage'), UNIT.surface);
  gl.uniform2f(program.uniform('uSize'), MAP_SIZE.width, MAP_SIZE.height);
  gl.uniform1f(program.uniform('uSeed'), CAMERA_SEED);
  gl.uniform4f(program.uniform('uLcdBox'), left, 1 - bottom, right, 1 - top);
  return program;
}

const keyUniforms = (points: readonly Point[], size: number, springs: readonly Spring[]) =>
  points.flatMap((point, i) => [...toMap(point), size * MAP_SCALE, springs[i].position]);

const springsFor = (points: readonly Point[]) => points.map(createSpring);

const KEY_REGIONS = {
  round: ROUND_KEYS.map((point) => keyRegion(point, ROUND_CAP_RADIUS)),
  pill: PILL_KEYS.map((point) => keyRegion(point, PILL_HALF_LENGTH)),
};

const moveSprings = (springs: Spring[], seconds: number, regions: readonly Region[], moved: Region[]) => {
  springs.forEach((spring, i) => {
    springs[i] = stepSpring(spring, seconds);
    if (springs[i].position !== spring.position) moved.push(regions[i]);
  });
  return springs.every(isSettled);
};

function segmentUploader(gl: Gl, textures: WebGLTexture[], onUploaded: () => void) {
  const raster = createSegmentRaster(LCD_REGION);
  const origin = [LCD_REGION.x, LCD_REGION.y] as const;
  const upload = (index: number, lit: ReadonlySet<string>) =>
    updateTextureRegion(gl, { unit: UNIT.segments[index], texture: textures[index] }, origin, raster(lit));
  textures.forEach((_, index) => upload(index, new Set()));
  let current = 0;
  let shown = '';
  return {
    current: () => current,
    push(lit: ReadonlySet<string>) {
      const signature = [...lit].sort().join();
      if (signature === shown) return;
      shown = signature;
      current = 1 - current;
      upload(current, lit);
      onUploaded();
    },
  };
}

function drawRegions(gl: Gl, regions: readonly Region[], drawQuad: () => void) {
  regions.forEach((region) => {
    gl.scissor(...scissorBox(region));
    drawQuad();
  });
}

export async function createDeviceRenderer(
  canvas: HTMLCanvasElement,
  initial: RenderSettings,
): Promise<DeviceRenderer> {
  canvas.width = MAP_SIZE.width;
  canvas.height = MAP_SIZE.height;
  const gl = webglContext(canvas);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  const drawQuad = createFullscreenQuad(gl);
  const textures = await bakeTextures(gl, initial);
  const surfaceTarget = createRenderTarget(gl, UNIT.surface, MAP_SIZE.width, MAP_SIZE.height);
  const state = {
    settings: initial,
    key: LIGHTING.key,
    keys: { round: springsFor(ROUND_KEYS), pill: springsFor(PILL_KEYS) },
    fadeStartedAt: 0,
    lastFrameAt: 0,
    frame: 0,
    redrawAll: true,
    lcdChanged: false,
  };
  let surface = surfaceProgram(gl, initial);
  let camera = cameraProgram(gl, initial);

  const segments = segmentUploader(gl, textures.segments, () => {
    state.fadeStartedAt = performance.now();
    state.lcdChanged = true;
    invalidate();
  });
  function changedRegions(seconds: number, fade: number) {
    const moved: Region[] = [];
    const roundSettled = moveSprings(state.keys.round, seconds, KEY_REGIONS.round, moved);
    const pillSettled = moveSprings(state.keys.pill, seconds, KEY_REGIONS.pill, moved);
    const keysSettled = roundSettled && pillSettled;
    const regions = state.redrawAll ? [FULL_REGION] : [...(state.lcdChanged ? [LCD_REGION] : []), ...moved];
    state.redrawAll = false;
    state.lcdChanged = fade < 1;
    return { regions, keysSettled };
  }
  function draw(now: number) {
    state.frame = 0;
    const seconds = state.lastFrameAt ? (now - state.lastFrameAt) / 1000 : 0;
    state.lastFrameAt = now;
    const fade = state.settings.lcdInertia ? Math.min(1, (now - state.fadeStartedAt) / LCD_FADE_MS) : 1;
    const { regions, keysSettled } = changedRegions(seconds, fade);
    const current = segments.current();
    gl.viewport(0, 0, MAP_SIZE.width, MAP_SIZE.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, surfaceTarget);
    surface.use();
    gl.uniform1i(surface.uniform('uSegmentsCurrent'), UNIT.segments[current]);
    gl.uniform1i(surface.uniform('uSegmentsPrevious'), UNIT.segments[1 - current]);
    gl.uniform1f(surface.uniform('uFade'), fade);
    gl.uniform3fv(surface.uniform('uKey'), state.key);
    gl.uniform4fv(surface.uniform('uCaps'), keyUniforms(ROUND_KEYS, ROUND_CAP_RADIUS, state.keys.round));
    gl.uniform4fv(surface.uniform('uPills'), keyUniforms(PILL_KEYS, PILL_HALF_LENGTH, state.keys.pill));
    drawRegions(gl, regions, drawQuad);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    camera.use();
    drawRegions(
      gl,
      regions.map((region) => expand(region, CAMERA_REACH)),
      drawQuad,
    );
    gl.disable(gl.SCISSOR_TEST);
    if (fade < 1 || !keysSettled) state.frame = requestAnimationFrame(draw);
    else state.lastFrameAt = 0;
  }
  function invalidate() {
    if (!state.frame) state.frame = requestAnimationFrame(draw);
  }
  function redrawAll() {
    state.redrawAll = true;
    invalidate();
  }
  invalidate();

  return {
    setLit: (lit) => segments.push(lit),
    setPressed(kind, index, down) {
      const spring = state.keys[kind][index];
      const target = down ? 1 : 0;
      if (spring.target === target) return;
      state.keys[kind][index] = { ...spring, target };
      invalidate();
    },
    setLight(key) {
      state.key = key;
      redrawAll();
    },
    async setSettings(next) {
      const previous = state.settings;
      state.settings = next;
      if (previous.wear !== next.wear)
        uploadTexture(gl, UNIT.albedo, textures.albedo, await svgToImage(albedoMap(next.wear)));
      if (definesFor(previous, 'surface').join() !== definesFor(next, 'surface').join()) {
        surface.dispose();
        surface = surfaceProgram(gl, next);
      }
      if (definesFor(previous, 'camera').join() !== definesFor(next, 'camera').join()) {
        camera.dispose();
        camera = cameraProgram(gl, next);
      }
      redrawAll();
    },
    dispose() {
      cancelAnimationFrame(state.frame);
      surface.dispose();
      camera.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
