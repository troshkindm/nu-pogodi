import { createFullscreenQuad, createProgram } from '../gl/program';
import { createImageTexture, uploadTexture } from '../gl/texture';
import { LIGHTING } from '../lighting';
import { VERTEX_SHADER, paperShader } from '../shaders';

import type { PageLayers } from './inks';
import { PAGE } from './typesetter';

export type Spine = 'left' | 'right';

export interface PaperSheet {
  layers: PageLayers;
  spine: Spine;
  cover: boolean;
  corner: number;
  seed: number;
}

export interface PaperRenderer {
  render(sheet: PaperSheet, target: HTMLCanvasElement): void;
  dispose(): void;
}

const UNIT = { print: 0, stamp: 1, pen: 2 };
const FLAT_PAPER = { page: '#e6d7ae', cover: '#eee6cf' };

function createFlatRenderer(): PaperRenderer {
  return {
    render({ layers, cover }, target) {
      const { width, height } = layers.print.canvas;
      target.width = width;
      target.height = height;
      const ctx = target.getContext('2d') as CanvasRenderingContext2D;
      ctx.fillStyle = cover ? FLAT_PAPER.cover : FLAT_PAPER.page;
      ctx.fillRect(0, 0, width, height);
      [layers.print, layers.stamp, layers.pen].forEach((layer) => ctx.drawImage(layer.canvas, 0, 0));
    },
    dispose() {
      return undefined;
    },
  };
}

export function createPaperRenderer(): PaperRenderer {
  try {
    return createShadedRenderer();
  } catch {
    return createFlatRenderer();
  }
}

function createShadedRenderer(): PaperRenderer {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL is not available');
  const program = createProgram(gl, VERTEX_SHADER, paperShader());
  const drawQuad = createFullscreenQuad(gl);
  const blank = document.createElement('canvas');
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const textures = {
    print: createImageTexture(gl, UNIT.print, blank),
    stamp: createImageTexture(gl, UNIT.stamp, blank),
    pen: createImageTexture(gl, UNIT.pen, blank),
  };

  program.use();
  gl.uniform1i(program.uniform('uPrint'), UNIT.print);
  gl.uniform1i(program.uniform('uStamp'), UNIT.stamp);
  gl.uniform1i(program.uniform('uPen'), UNIT.pen);
  gl.uniform3fv(program.uniform('uKey'), LIGHTING.key);
  gl.uniform3fv(program.uniform('uKeyColor'), LIGHTING.keyColor);
  gl.uniform3fv(program.uniform('uFill'), LIGHTING.flash);
  gl.uniform3fv(program.uniform('uFillColor'), LIGHTING.flashColor);
  gl.uniform3fv(program.uniform('uAmbient'), LIGHTING.ambient);

  return {
    render({ layers, spine, cover, corner, seed }, target) {
      const { width, height } = layers.print.canvas;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      uploadTexture(gl, UNIT.print, textures.print, layers.print.canvas);
      uploadTexture(gl, UNIT.stamp, textures.stamp, layers.stamp.canvas);
      uploadTexture(gl, UNIT.pen, textures.pen, layers.pen.canvas);
      program.use();
      gl.uniform2f(program.uniform('uSize'), width, height);
      gl.uniform1f(program.uniform('uScale'), width / PAGE.width);
      gl.uniform1f(program.uniform('uSeed'), seed);
      gl.uniform1f(program.uniform('uSpine'), spine === 'left' ? 0 : 1);
      gl.uniform1f(program.uniform('uCover'), cover ? 1 : 0);
      gl.uniform1f(program.uniform('uCorner'), corner);
      gl.uniform1f(program.uniform('uSpreadX'), spine === 'left' ? 1 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawQuad();
      target.width = width;
      target.height = height;
      const ctx = target.getContext('2d') as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(canvas, 0, 0);
    },
    dispose() {
      program.dispose();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
