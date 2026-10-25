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
import { createImageTexture, createRenderTarget, svgToImage, uploadTexture } from './gl/texture';
import { createSpring, isSettled, stepSpring } from './keySpring';
import type { Spring } from './keySpring';
import { backgroundLayer, printLayer, segmentLayer } from './lcd/layers';
import { LIGHTING } from './lighting';
import type { Vector3 } from './lighting';
import { albedoMap } from './maps/albedo';
import { heightMap } from './maps/height';
import { materialMap } from './maps/material';
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
  const layers = [
    albedoMap(settings.wear),
    heightMap(),
    materialMap(),
    backgroundLayer(),
    printLayer(),
    segmentLayer(new Set()),
  ];
  const [albedo, height, material, background, print, segments] = await Promise.all(layers.map(svgToImage));
  createImageTexture(gl, UNIT.height, height);
  createImageTexture(gl, UNIT.material, material);
  createImageTexture(gl, UNIT.lcd, background);
  createImageTexture(gl, UNIT.print, print);
  return {
    albedo: createImageTexture(gl, UNIT.albedo, albedo),
    segments: UNIT.segments.map((unit) => createImageTexture(gl, unit, segments)),
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

const moveSprings = (springs: Spring[], seconds: number) => {
  springs.forEach((spring, i) => {
    springs[i] = stepSpring(spring, seconds);
  });
  return springs.every(isSettled);
};

function segmentUploader(gl: Gl, textures: WebGLTexture[], onUploaded: () => void) {
  let current = 0;
  let shown = '';
  let pending: ReadonlySet<string> | null = null;
  let busy = false;
  const upload = async (lit: ReadonlySet<string>): Promise<void> => {
    busy = true;
    const image = await svgToImage(segmentLayer(lit));
    current = 1 - current;
    uploadTexture(gl, UNIT.segments[current], textures[current], image);
    busy = false;
    onUploaded();
    const next = pending;
    pending = null;
    if (next) await upload(next);
  };
  return {
    current: () => current,
    push(lit: ReadonlySet<string>) {
      const signature = [...lit].sort().join();
      if (signature === shown) return;
      shown = signature;
      if (busy) pending = lit;
      else upload(lit).catch(() => undefined);
    },
  };
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
  };
  let surface = surfaceProgram(gl, initial);
  let camera = cameraProgram(gl, initial);

  const segments = segmentUploader(gl, textures.segments, () => {
    state.fadeStartedAt = performance.now();
    invalidate();
  });
  function draw(now: number) {
    state.frame = 0;
    const seconds = state.lastFrameAt ? (now - state.lastFrameAt) / 1000 : 0;
    state.lastFrameAt = now;
    const keysSettled = moveSprings(state.keys.round, seconds) && moveSprings(state.keys.pill, seconds);
    const fade = state.settings.lcdInertia ? Math.min(1, (now - state.fadeStartedAt) / LCD_FADE_MS) : 1;
    const current = segments.current();
    gl.viewport(0, 0, MAP_SIZE.width, MAP_SIZE.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, surfaceTarget);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    surface.use();
    gl.uniform1i(surface.uniform('uSegmentsCurrent'), UNIT.segments[current]);
    gl.uniform1i(surface.uniform('uSegmentsPrevious'), UNIT.segments[1 - current]);
    gl.uniform1f(surface.uniform('uFade'), fade);
    gl.uniform3fv(surface.uniform('uKey'), state.key);
    gl.uniform4fv(surface.uniform('uCaps'), keyUniforms(ROUND_KEYS, ROUND_CAP_RADIUS, state.keys.round));
    gl.uniform4fv(surface.uniform('uPills'), keyUniforms(PILL_KEYS, PILL_HALF_LENGTH, state.keys.pill));
    drawQuad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    camera.use();
    drawQuad();
    if (fade < 1 || !keysSettled) state.frame = requestAnimationFrame(draw);
    else state.lastFrameAt = 0;
  }
  function invalidate() {
    if (!state.frame) state.frame = requestAnimationFrame(draw);
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
      invalidate();
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
      invalidate();
    },
    dispose() {
      cancelAnimationFrame(state.frame);
      surface.dispose();
      camera.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
