import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const W = 1000;
const H = 600;
const wx = (x) => x - W / 2;
const wy = (y) => H / 2 - y;

const DEPTH = {
  plate: 0,
  trayFloor: -14,
  lipTop: -9.5,
  windowFloor: -27,
  lcd: -27.2,
  segments: -25.6,
  glass: -11,
};

function planarUV(geometry) {
  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = (position.getX(i) + W / 2 - VIEW.x) / VIEW.w;
    uv[i * 2 + 1] = 1 - (H / 2 - position.getY(i) - VIEW.y) / VIEW.h;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function roundedRectPath(path, { x1, y1, x2, y2 }, r) {
  const left = wx(x1);
  const right = wx(x2);
  const top = wy(y1);
  const bottom = wy(y2);
  path.moveTo(left + r, top);
  path.lineTo(right - r, top);
  path.quadraticCurveTo(right, top, right, top - r);
  path.lineTo(right, bottom + r);
  path.quadraticCurveTo(right, bottom, right - r, bottom);
  path.lineTo(left + r, bottom);
  path.quadraticCurveTo(left, bottom, left, bottom + r);
  path.lineTo(left, top - r);
  path.quadraticCurveTo(left, top, left + r, top);
  return path;
}

const rectShape = (rect, r) => roundedRectPath(new THREE.Shape(), rect, r);
const rectHole = (rect, r) => roundedRectPath(new THREE.Path(), rect, r);
const circleHole = (cx, cy, r) => new THREE.Path().absarc(wx(cx), wy(cy), r, 0, Math.PI * 2, true);
const capsuleRect = (cx, cy, w, h) => ({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 });

function flatShape(shape, z) {
  const geometry = new THREE.ShapeGeometry(shape, 24);
  geometry.translate(0, 0, z);
  return planarUV(geometry);
}

function extruded(shape, z, depth, bevel = 0) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 24,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
  });
  geometry.translate(0, 0, z);
  return planarUV(geometry);
}

function frustum(outer, inner, zTop, zBottom) {
  const o = [[outer.x1, outer.y1], [outer.x2, outer.y1], [outer.x2, outer.y2], [outer.x1, outer.y2]];
  const n = [[inner.x1, inner.y1], [inner.x2, inner.y1], [inner.x2, inner.y2], [inner.x1, inner.y2]];
  const positions = [];
  for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    const quad = [
      [wx(o[side][0]), wy(o[side][1]), zTop],
      [wx(o[next][0]), wy(o[next][1]), zTop],
      [wx(n[next][0]), wy(n[next][1]), zBottom],
      [wx(n[side][0]), wy(n[side][1]), zBottom],
    ];
    const a = new THREE.Vector3(...quad[0]);
    const b = new THREE.Vector3(...quad[1]);
    const c = new THREE.Vector3(...quad[2]);
    const facing = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const order = facing.z >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    order.forEach((index) => positions.push(...quad[index]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return planarUV(geometry);
}

function capGeometry(radius) {
  const profile = [
    [0, 3.2], [6, 3.4], [12, 4.1], [17, 5.1], [21, 6.0], [23.6, 6.5], [24.6, 6.1], [25, 5.0], [25, -5],
  ].reverse().map(([r, h]) => new THREE.Vector2(r * (radius / 25), h));
  const geometry = new THREE.LatheGeometry(profile, 64);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function grainTextures() {
  const size = 512;
  const bump = document.createElement('canvas');
  const rough = document.createElement('canvas');
  bump.width = bump.height = rough.width = rough.height = size;
  const b = bump.getContext('2d');
  const r = rough.getContext('2d');
  const bumpData = b.createImageData(size, size);
  const roughData = r.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 110 + Math.random() * 60 + (Math.random() < 0.04 ? 60 : 0);
    bumpData.data.set([v, v, v, 255], i * 4);
    const g = Math.random() < 0.025 ? 38 : 150 + Math.random() * 40;
    roughData.data.set([g, g, g, 255], i * 4);
  }
  b.putImageData(bumpData, 0, 0);
  r.putImageData(roughData, 0, 0);
  return [bump, rough].map((canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.2, 1.32);
    return texture;
  });
}

function smoothNoise1d(length, radius) {
  const raw = Float32Array.from({ length }, () => Math.random());
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let j = -radius; j <= radius; j++) sum += raw[(i + j + length) % length];
    out[i] = sum;
  }
  const min = Math.min(...out);
  const max = Math.max(...out);
  return out.map((v) => (v - min) / (max - min));
}

function woodTextures() {
  const size = 1024;
  const color = document.createElement('canvas');
  const rough = document.createElement('canvas');
  color.width = rough.width = color.height = rough.height = size;
  const colorContext = color.getContext('2d');
  const roughContext = rough.getContext('2d');
  const colorData = colorContext.createImageData(size, size);
  const roughData = roughContext.createImageData(size, size);
  const fine = smoothNoise1d(size, 1);
  const mid = smoothNoise1d(size, 6);
  const broad = smoothNoise1d(size, 70);
  const phase = Array.from({ length: 4 }, () => Math.random() * Math.PI * 2);
  const dark = [40, 25, 17];
  const light = [120, 79, 51];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const warp = 22 * Math.sin(u + phase[0]) + 7 * Math.sin(3 * u + 2 * v + phase[1]) + 2.5 * Math.sin(9 * u + phase[2]);
      const row = (Math.floor(y + warp) % size + size) % size;
      const along = 0.94 + 0.06 * Math.sin(2 * u + 5 * v + phase[3]);
      const tone = Math.min(1, Math.max(0, (0.18 + 0.5 * broad[row] + 0.22 * mid[row] + 0.18 * fine[row]) * along));
      const i = (y * size + x) * 4;
      colorData.data.set(dark.map((d, c) => d + (light[c] - d) * tone).concat(255), i);
      const g = 95 + 60 * (1 - tone);
      roughData.data.set([g, g, g, 255], i);
    }
  }
  colorContext.putImageData(colorData, 0, 0);
  roughContext.putImageData(roughData, 0, 0);
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const length = 2 + Math.random() * 7;
    colorContext.fillStyle = 'rgba(20, 10, 5, 0.14)';
    colorContext.fillRect(x, y, length, 1);
    roughContext.fillStyle = 'rgba(230, 230, 230, 0.8)';
    roughContext.fillRect(x, y, length, 1);
  }
  return [color, rough].map((canvas, index) => {
    const texture = new THREE.CanvasTexture(canvas);
    if (index === 0) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.anisotropy = 8;
    return texture;
  });
}

function contactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  context.filter = 'blur(16px)';
  context.fillStyle = '#000';
  context.beginPath();
  context.roundRect(58, 58, 396, 204, 18);
  context.fill();
  return new THREE.CanvasTexture(canvas);
}

const CAMERA_POST = {
  uniforms: { tDiffuse: { value: null }, uSize: { value: new THREE.Vector2(1, 1) }, uSeed: { value: 7.3 }, uLens: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uSize;
    uniform float uSeed, uLens;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main() {
      vec2 c = vUv - vec2(0.5);
      float r2 = dot(c, c);
      vec2 duv = vec2(0.5) + c * (1.0 + 0.012 * r2 * uLens);
      vec2 px = 1.0 / uSize;
      vec2 dir = c / max(length(c), 0.0001);
      float ca = 5.5 * r2 * uLens;
      vec3 base = texture2D(tDiffuse, duv).rgb;
      vec3 sharp = vec3(texture2D(tDiffuse, duv + dir * px * ca).r, base.g, texture2D(tDiffuse, duv - dir * px * ca).b);
      vec3 blur1 = vec3(0.0), blur2 = vec3(0.0), bloom = vec3(0.0);
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7853982 + 0.3;
        vec2 o = vec2(cos(a), sin(a)) * px;
        blur1 += texture2D(tDiffuse, duv + o * 1.1).rgb;
        blur2 += texture2D(tDiffuse, duv + o * 2.6).rgb;
        bloom += texture2D(tDiffuse, duv + o * 9.0).rgb + texture2D(tDiffuse, duv + o * 20.0).rgb;
      }
      blur1 /= 8.0; blur2 /= 8.0; bloom /= 16.0;
      vec3 soft = mix(sharp, blur1, 0.3 * uLens);
      vec3 col = soft + (soft - blur2) * 0.38 * uLens;
      float yC = dot(col, vec3(0.299, 0.587, 0.114));
      float yB = dot(blur2, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(yC) + (blur2 - vec3(yB)), 0.8 * uLens);
      col += max(bloom - vec3(0.7), 0.0) * 0.28 * uLens;
      vec3 g = clamp(col, 0.0, 1.0);
      g = mix(g, g * g * (3.0 - 2.0 * g), 0.18);
      g *= 1.0 - 0.2 * pow(length(c * vec2(1.0, 0.8)) * 1.35, 2.5);
      vec2 fc = vUv * uSize;
      float lum = dot(g, vec3(0.333));
      g += (hash(fc + uSeed) - 0.5) * (0.04 - 0.024 * lum) * uLens;
      g += (hash(floor(fc / 8.0) + uSeed * 0.37) - 0.5) * 0.012 * uLens;
      vec3 blotchy = vec3(hash(floor(fc / 2.6) + 2.2), hash(floor(fc / 2.6) + 6.6), hash(floor(fc / 2.6) + 9.9)) - 0.5;
      g += (blotchy - vec3(dot(blotchy, vec3(0.333)))) * 0.024 * uLens;
      gl_FragColor = vec4(g, 1.0);
    }`,
};

export async function start3d() {
  const frameElement = document.querySelector('.frame');
  const canvas = document.createElement('canvas');
  canvas.id = 'three';
  canvas.style.cssText = REF ? 'position:absolute;inset:0;width:100%;height:100%;display:block' : 'position:fixed;inset:0;width:100vw;height:100dvh;display:block';
  (REF ? frameElement : document.body).appendChild(canvas);
  document.getElementById('device').style.visibility = 'hidden';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = Number(params.get('exposure')) || 0.94;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0907);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const [albedoImage, materialImage, lcdBackImage, lcdSegImage, lcdPrintImage] = await Promise.all([
    loadImage(albedoMap()),
    loadImage(materialMap()),
    loadImage(lcdMarkup(LCD_BACK_STYLE)),
    loadImage(lcdMarkup(LCD_SEG_STYLE)),
    loadImage(lcdMarkup(LCD_PRINT_STYLE)),
  ]);
  const imageTexture = (image) => {
    const texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
    return texture;
  };
  const albedo = imageTexture(albedoImage);
  const lcdBack = imageTexture(lcdBackImage);
  const lcdSeg = imageTexture(lcdSegImage);
  const lcdPrint = imageTexture(lcdPrintImage);
  const [grainBump, grainRough] = grainTextures();

  const plastic = new THREE.MeshPhysicalMaterial({
    map: albedo, roughness: 0.9, roughnessMap: grainRough, bumpMap: grainBump, bumpScale: 0.55,
    clearcoat: 0.12, clearcoatRoughness: 0.55, envMapIntensity: 0.35,
  });
  const smooth = new THREE.MeshPhysicalMaterial({ map: albedo, roughness: 0.5, envMapIntensity: 0.35 });
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xb3a29c, roughness: 0.9, roughnessMap: grainRough, bumpMap: grainBump, bumpScale: 0.55, clearcoat: 0.12, clearcoatRoughness: 0.55, envMapIntensity: 0.35 });
  const capMaterial = new THREE.MeshPhysicalMaterial({ color: 0x16161a, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.4 });
  const pillMaterial = new THREE.MeshPhysicalMaterial({ color: 0x7a6e7c, roughness: 0.48, clearcoat: 0.15, envMapIntensity: 0.6 });
  const wellMaterial = new THREE.MeshStandardMaterial({ color: 0x0a090b, roughness: 0.85 });
  const lcdMaterial = new THREE.MeshStandardMaterial({ map: lcdBack, roughness: 0.85, envMapIntensity: 0.2 });
  const segMaterial = new THREE.MeshBasicMaterial({ map: lcdSeg, color: 0x000000, transparent: true, alphaTest: 0.02, depthWrite: false });
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, envMapIntensity: REF ? 0.25 : 0.85, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

  const group = new THREE.Group();
  scene.add(group);
  const add = (geometry, material, { cast = true, receive = true } = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    group.add(mesh);
    return mesh;
  };

  const rim = rectShape(CASE, 15);
  rim.holes.push(rectHole({ x1: PLATE.x, y1: PLATE.y, x2: PLATE.x + PLATE.w, y2: PLATE.y + PLATE.h }, 12));
  add(extruded(rim, -40, 38, 5), [plastic, shell]);
  add(extruded(rectShape({ x1: CASE.x1 + 6, y1: CASE.y1 + 6, x2: CASE.x2 - 6, y2: CASE.y2 - 6 }, 12), -106, 64, 4), shell);

  const plateShape = rectShape({ x1: PLATE.x, y1: PLATE.y, x2: PLATE.x + PLATE.w, y2: PLATE.y + PLATE.h }, 12);
  plateShape.holes.push(rectHole(TRAY_OUTER, 6));
  ROUND_KEYS.forEach(([cx, cy]) => plateShape.holes.push(circleHole(cx, cy, 28.5)));
  PILL_KEYS.forEach(([cx, cy]) => plateShape.holes.push(rectHole(capsuleRect(cx, cy, 49, 28), 14)));
  HOLES.forEach(([cx, cy]) => plateShape.holes.push(circleHole(cx, cy, 12.5)));
  add(flatShape(plateShape, DEPTH.plate), plastic, { cast: false });

  add(frustum(TRAY_OUTER, TRAY_FLOOR, DEPTH.plate, DEPTH.trayFloor), plastic);
  const floorShape = rectShape(TRAY_FLOOR, 8);
  floorShape.holes.push(rectHole(LIP, 13));
  add(flatShape(floorShape, DEPTH.trayFloor), plastic, { cast: false });

  const lipShape = rectShape(LIP, 13);
  lipShape.holes.push(rectHole(WINDOW, 4));
  add(extruded(lipShape, DEPTH.trayFloor, DEPTH.lipTop - DEPTH.trayFloor - 1.2, 1.2), smooth);
  add(frustum(WINDOW, LCD_RECT, DEPTH.lipTop, DEPTH.windowFloor), smooth);

  const lcdPlane = planarUV(flatShape(rectShape(LCD_RECT, 1.5), DEPTH.lcd));
  add(lcdPlane, lcdMaterial, { cast: false });
  const segMesh = add(planarUV(flatShape(rectShape(LCD_RECT, 1.5), DEPTH.segments)), segMaterial, { receive: false });
  segMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: lcdSeg, alphaTest: 0.5 });
  const printCaster = add(planarUV(flatShape(rectShape(LCD_RECT, 1.5), DEPTH.lcd + 0.9)), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true }), { receive: false });
  printCaster.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: lcdPrint, alphaTest: 0.5 });
  add(flatShape(rectShape(WINDOW, 4), DEPTH.glass), glassMaterial, { cast: false, receive: false });

  const caps = ROUND_KEYS.map(([cx, cy]) => {
    const washer = new THREE.Shape().absarc(wx(cx), wy(cy), 37, 0, Math.PI * 2, false);
    washer.holes.push(circleHole(cx, cy, 28.5));
    add(extruded(washer, 0, 2.2, 0.9), plastic);
    const well = new THREE.CylinderGeometry(28.5, 28.5, 10, 48, 1, true);
    well.rotateX(Math.PI / 2);
    well.translate(wx(cx), wy(cy), -5);
    add(well, wellMaterial, { cast: false });
    const floor = new THREE.CircleGeometry(28.5, 48);
    floor.translate(wx(cx), wy(cy), -9.5);
    add(floor, wellMaterial, { cast: false });
    const cap = add(capGeometry(26), capMaterial);
    cap.position.set(wx(cx), wy(cy), 0);
    return cap;
  });

  const pills = PILL_KEYS.map(([cx, cy]) => {
    const ring = rectShape(capsuleRect(cx, cy, 58, 41), 20.5);
    ring.holes.push(rectHole(capsuleRect(cx, cy, 49, 28), 14));
    add(extruded(ring, 0, 1.6, 0.9), plastic);
    const well = new THREE.Shape();
    roundedRectPath(well, capsuleRect(cx, cy, 49, 28), 14);
    add(flatShape(well, -6), wellMaterial, { cast: false });
    const pillGeometry = new THREE.ExtrudeGeometry(rectShape(capsuleRect(cx, cy, 41, 17), 8.5), {
      depth: 2, curveSegments: 24, bevelEnabled: true, bevelThickness: 2.6, bevelSize: 2.2, bevelSegments: 6,
    });
    pillGeometry.translate(0, 0, -1);
    const pill = add(pillGeometry, pillMaterial);
    return pill;
  });

  HOLES.forEach(([cx, cy]) => {
    const well = new THREE.CylinderGeometry(12.5, 12.5, 12, 32, 1, true);
    well.rotateX(Math.PI / 2);
    well.translate(wx(cx), wy(cy), -6);
    add(well, wellMaterial, { cast: false });
    const floor = new THREE.CircleGeometry(12.5, 32);
    floor.translate(wx(cx), wy(cy), -11.5);
    add(floor, wellMaterial, { cast: false });
  });

  const key = new THREE.DirectionalLight(0xfff4ea, Number(params.get('key')) || 1.7);
  key.position.set(-560, 640, 900);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, REF ? { left: -560, right: 560, top: 340, bottom: -340, near: 100, far: 3000 } : { left: -900, right: 900, top: 700, bottom: -700, near: 100, far: 4000 });
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.4;
  key.shadow.radius = 3;
  scene.add(key);
  const flash = new THREE.DirectionalLight(0xf6f4f8, Number(params.get('flash')) || 0.55);
  flash.position.set(40, 160, 2400);
  scene.add(flash);

  if (!REF) {
    const [woodColor, woodRough] = woodTextures();
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshPhysicalMaterial({
      map: woodColor, roughnessMap: woodRough, roughness: 1, clearcoat: 0.35, clearcoatRoughness: 0.32, envMapIntensity: 0.5,
    }));
    desk.rotation.x = -Math.PI / 2;
    desk.receiveShadow = true;
    scene.add(desk);
    group.rotation.set(-Math.PI / 2, 0, 0.16);
    group.updateMatrixWorld(true);
    group.position.y -= new THREE.Box3().setFromObject(group).min.y;
    const footprint = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1300, 930), new THREE.MeshBasicMaterial({ map: contactShadowTexture(), color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false }));
    contact.rotation.set(-Math.PI / 2, 0, 0.16);
    contact.position.set(footprint.x, 0.6, footprint.z);
    scene.add(contact);
    scene.remove(key, flash);
    const lamp = new THREE.SpotLight(0xffe2c4, Number(params.get('key')) || 2.3, 0, 0.75, 0.9, 0);
    lamp.position.set(footprint.x - 800, 2100, footprint.z - 1000);
    lamp.target.position.copy(footprint);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(4096, 4096);
    lamp.shadow.camera.near = 600;
    lamp.shadow.camera.far = 6000;
    lamp.shadow.bias = -0.0002;
    lamp.shadow.normalBias = 0.5;
    scene.add(lamp, lamp.target);
    scene.add(new THREE.HemisphereLight(0xd8e0ff, 0x3a2618, 0.35));
    scene.background = new THREE.Color(0x0a0705);
    scene.fog = new THREE.Fog(0x0a0705, 4200, 8500);
  }
  const camera = new THREE.PerspectiveCamera(11, 1681 / 1011, 50, 10000);
  const visibleHeight = (1681 / 1.626) / (1681 / 1011);
  const distance = visibleHeight / 2 / Math.tan(THREE.MathUtils.degToRad(5.5));
  camera.position.set(6.5, 1.2, distance);
  camera.lookAt(6.5, 1.2, 0);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(6.5, 1.2, 0);
  controls.enableDamping = true;
  controls.enabled = !REF;
  const viewDirection = new THREE.Vector3(...(params.get('view') || '-0.3,0.66,0.72').split(',').map(Number)).normalize();
  if (!REF) {
    controls.target.copy(new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
    controls.maxPolarAngle = 1.38;
    controls.minDistance = 1200;
    controls.maxDistance = 7000;
  }
  function fitCamera() {
    if (REF) return;
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const fit = Math.max(1080 / (2 * Math.tan(horizontal / 2)), 760 / (2 * Math.tan(vertical / 2))) * (camera.aspect < 1 ? 1.08 : 1.25);
    controls.maxDistance = Math.max(7000, fit * 1.6);
    scene.fog.near = fit + 1200;
    scene.fog.far = fit + 5500;
    camera.position.copy(controls.target).addScaledVector(viewDirection, fit);
    controls.update();
  }
  if (!REF) camera.fov = 22;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = REF ? null : new BokehPass(scene, camera, { focus: 3000, aperture: Number(params.get('aperture') ?? 3.5) * 0.000001, maxblur: 0.006 });
  if (bokeh) composer.addPass(bokeh);
  composer.addPass(new OutputPass());
  const cameraPass = new ShaderPass(CAMERA_POST);
  cameraPass.uniforms.uLens.value = params.has('nolens') ? 0 : 1;
  composer.addPass(cameraPass);

  function resize() {
    const { width, height } = (REF ? frameElement : canvas).getBoundingClientRect();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    const ratio = renderer.getPixelRatio();
    cameraPass.uniforms.uSize.value.set(width * ratio, height * ratio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitCamera();
  }
  resize();
  window.addEventListener('resize', () => { resize(); render(); });

  let frameRequested = false;
  function render() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      caps.forEach((cap, i) => { cap.position.z = -pressed.round[i] * 1.6; });
      pills.forEach((pill, i) => { pill.position.z = -pressed.pill[i] * 1.2; });
      if (controls.update()) render();
      if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(controls.target);
      composer.render();
      document.body.dataset.baked = 'yes';
    });
  }
  controls.addEventListener('change', render);

  let lcdBusy = false;
  window.updateLcd3d = async () => {
    if (lcdBusy) return;
    lcdBusy = true;
    lcdSeg.image = await loadImage(lcdMarkup(LCD_SEG_STYLE));
    lcdSeg.needsUpdate = true;
    segMesh.customDepthMaterial.map = lcdSeg;
    lcdBusy = false;
    render();
  };
  window.render3d = render;
  window.capture3d = () => {
    if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(controls.target);
    composer.render();
    return canvas.toDataURL('image/png');
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets = [...caps.map((mesh, i) => ({ mesh, list: 'round', i })), ...pills.map((mesh, i) => ({ mesh, list: 'pill', i }))];
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(targets.map((t) => t.mesh))[0];
    if (!hit) return;
    const target = targets.find((t) => t.mesh === hit.object);
    controls.enabled = false;
    window.press3d?.(target.list, target.i, true);
    const release = () => { window.press3d?.(target.list, target.i, false); controls.enabled = !REF; window.removeEventListener('pointerup', release); };
    window.addEventListener('pointerup', release);
  });

  render();
}
