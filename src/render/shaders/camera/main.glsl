uniform sampler2D uImage;
uniform vec2 uSize;
uniform float uSeed;
uniform vec4 uLcdBox;

vec2 lensUv(vec2 uv, vec2 center, float r2) {
  vec2 distorted = vec2(0.5) + center * (1.0 + 0.025 * r2);
  distorted.x += 0.008 * (0.5 - uv.y) * uSize.y / uSize.x;
  return distorted + (vec2(noise(gl_FragCoord.xy / 520.0 + 3.0), noise(gl_FragCoord.xy / 560.0 + 9.0)) - 0.5) * 8.0 / uSize;
}

vec4 ring(vec2 uv, float radius) {
  vec4 sum = vec4(0.0);
  vec2 texel = 1.0 / uSize;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982 + 0.3;
    sum += texture2D(uImage, uv + vec2(cos(a), sin(a)) * texel * radius);
  }
  return sum / 8.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 center = uv - vec2(0.5);
  float r2 = dot(center, center);
  vec2 inLcdBox = step(uLcdBox.xy, uv) * step(uv, uLcdBox.zw);
  float lcdArea = inLcdBox.x * inLcdBox.y;

#ifdef LENS_DISTORTION
  vec2 sampleUv = lensUv(uv, center, r2);
#else
  vec2 sampleUv = uv;
#endif

  vec4 col = texture2D(uImage, sampleUv);
#ifdef CHROMATIC_ABERRATION
  vec2 radial = center / max(length(center), 0.0001) / uSize * (5.5 * r2 + 1.0);
  col = vec4(texture2D(uImage, sampleUv + radial).r, col.g, texture2D(uImage, sampleUv - radial).b, col.a);
#endif

#ifdef LENS_SOFTNESS
  vec4 nearBlur = ring(sampleUv, 1.9);
  vec4 farBlur = ring(sampleUv, 3.2);
  vec4 soft = mix(col, nearBlur, mix(0.28, 0.6, lcdArea));
  col = soft + clamp(soft - farBlur, vec4(-0.1), vec4(0.075)) * mix(1.1, 0.15, lcdArea);
  col.rgb = mix(col.rgb, vec3(dot(col.rgb, vec3(0.299, 0.587, 0.114))) + (farBlur.rgb - vec3(dot(farBlur.rgb, vec3(0.299, 0.587, 0.114)))), 0.8);
#endif

  float halo = 0.0;
#ifdef BLOOM
  vec4 glow = (ring(sampleUv, 10.0) + ring(sampleUv, 22.0)) * 0.5;
  col.rgb += max(glow.rgb - vec3(0.88 * glow.a), 0.0) * 0.5;
  halo = min(1.0, (1.0 - col.a) * glow.a * 1.2);
#endif

  float alpha = max(col.a, 0.0001);
  vec3 g = clamp(col.rgb / alpha, 0.0, 1.0);
  g *= vec3(1.0, 0.995, 1.006);
  g = mix(g, g * g * (3.0 - 2.0 * g), 0.22);
  float lum = dot(g, vec3(0.333));
  g = mix(g, max(g - 0.012, 0.0) / 0.988, lcdArea);
  float grainScale = mix(1.0, 0.25 * smoothstep(0.02, 0.12, lum), lcdArea);

#ifdef SENSOR_NOISE
  g += ((noise(gl_FragCoord.xy / 1.8 + uSeed) - 0.5) * 0.8 + (hash(gl_FragCoord.xy + uSeed) - 0.5) * 0.35) * (0.022 - 0.012 * lum) * grainScale;
  g += (vec3(noise(gl_FragCoord.xy / 2.4 + 1.7), noise(gl_FragCoord.xy / 2.4 + 5.3), noise(gl_FragCoord.xy / 2.4 + 9.1)) - 0.5) * 0.03 * grainScale;
  vec2 chromaCell = floor(gl_FragCoord.xy / 2.6);
  vec3 blotchy = vec3(hash(chromaCell + 2.2), hash(chromaCell + 6.6), hash(chromaCell + 9.9)) - 0.5;
  g += (blotchy - vec3(dot(blotchy, vec3(0.333)))) * 0.04 * grainScale;
#endif
#ifdef JPEG_BLOCKS
  g += (hash(floor(gl_FragCoord.xy / 8.0) + uSeed * 0.37) - 0.5) * 0.018 * grainScale;
#endif

  gl_FragColor = vec4(g * col.a + vec3(0.129, 0.098, 0.082) * halo * 0.9, col.a + halo * 0.9 * (1.0 - col.a));
}
