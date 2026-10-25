vec3 toLinear(vec3 color) {
  return pow(color, vec3(2.2));
}

vec3 paperAlbedo(vec2 p) {
  vec3 albedo = toLinear(mix(vec3(0.97, 0.91, 0.7), vec3(0.96, 0.94, 0.86), uCover));
  float stain = fbm(p / 380.0 + uSeed * 2.3);
  albedo *= mix(vec3(1.0), vec3(0.95, 0.88, 0.72), smoothstep(0.42, 0.78, stain));
  albedo *= 1.0 + ((noise(p / 2.2) - 0.5) * 0.08 + (noise(p / 9.0) - 0.5) * 0.03) * mix(1.0, 0.25, uCover);

  vec2 cell = floor(p / 46.0);
  vec2 spot = (cell + vec2(hash(cell + uSeed), hash(cell + uSeed + 3.7))) * 46.0;
  float radius = 1.5 + 4.0 * hash(cell + 9.1);
  float foxing = step(0.965, hash(cell + uSeed * 5.0)) * smoothstep(radius, radius * 0.3, length(p - spot));
  albedo *= mix(vec3(1.0), vec3(0.78, 0.62, 0.4), foxing * 0.7);

  vec2 outer = vec2(PAGE.x - fromSpine(p), min(p.y, PAGE.y - p.y));
  float edge = min(outer.x, outer.y) + (noise(p / 11.0) - 0.5) * 16.0;
  albedo *= mix(vec3(0.88, 0.8, 0.62), vec3(1.0), smoothstep(0.0, 22.0, edge));
  float thumb = smoothstep(240.0, 40.0, length(vec2(outer.x, PAGE.y - p.y) * vec2(1.0, 0.8)));
  albedo *= 1.0 - thumb * 0.07 * fbm(p / 30.0);
  return albedo;
}

float inkVoids(vec2 p) {
  float tooth = noise(p / 1.7) * 0.6 + noise(p / 5.0) * 0.4;
  return smoothstep(0.7, 0.88, tooth) * 0.22;
}

vec4 spreadInk(sampler2D layer, vec2 uv, float radius) {
  vec2 texel = radius / uSize;
  vec4 sum = texture2D(layer, uv) * 2.0;
  sum += texture2D(layer, uv + vec2(texel.x, 0.0)) + texture2D(layer, uv - vec2(texel.x, 0.0));
  sum += texture2D(layer, uv + vec2(0.0, texel.y)) + texture2D(layer, uv - vec2(0.0, texel.y));
  return sum / 6.0;
}

vec3 applyPrint(vec3 albedo, vec2 p, vec2 uv, float wear) {
  vec4 sharp = texture2D(uPrint, uv);
  vec4 ink = spreadInk(uPrint, uv, 0.8);
  float body = clamp(max(sharp.a, ink.a * 1.25), 0.0, 1.0);
  float coverage = body * (1.0 - inkVoids(p) * (1.0 - uCover)) * (1.0 - wear);
  coverage *= mix(0.96 + 0.04 * noise(p / 14.0 + uSeed), 0.94 + 0.06 * fbm(p / 160.0 + uSeed), uCover);
  vec3 color = toLinear(ink.rgb / max(ink.a, 0.001));
  return albedo * mix(vec3(1.0), color * 1.08, coverage);
}

vec3 applyStamp(vec3 albedo, vec2 p, vec2 uv) {
  vec4 ink = texture2D(uStamp, uv);
  vec4 soft = spreadInk(uStamp, uv, 2.2);
  float pressure = smoothstep(0.2, 0.8, noise(p / 26.0 + uSeed * 4.0) * 0.7 + noise(p / 8.0) * 0.3);
  float holes = smoothstep(0.55, 0.75, noise(p / 2.4 + 3.0) * 0.5 + noise(p / 6.0 + 1.0) * 0.5);
  float rim = clamp((ink.a - soft.a) * 2.5, 0.0, 1.0);
  float coverage = ink.a * (0.55 + 0.45 * pressure) * (1.0 - 0.6 * holes) + rim * 0.3;
  vec3 color = toLinear(ink.rgb / max(ink.a, 0.001));
  return albedo * mix(vec3(1.0), color * 1.1, clamp(coverage, 0.0, 1.0) * 0.94);
}

vec3 applyPen(vec3 albedo, vec2 p, vec2 uv, out float gloss) {
  vec4 ink = texture2D(uPen, uv);
  float coverage = ink.a * (0.9 + 0.1 * noise(p / 1.4));
  gloss = coverage;
  vec3 color = toLinear(ink.rgb / max(ink.a, 0.001));
  return albedo * mix(vec3(1.0), color, coverage * 0.95);
}

float coverWear(vec2 p) {
  vec2 edges = vec2(min(p.x, PAGE.x - p.x), min(p.y, PAGE.y - p.y));
  float edge = min(edges.x, edges.y) + (noise(p / 6.0) - 0.5) * 3.0 + (noise(p / 37.0) - 0.5) * 5.0;
  float corner = smoothstep(26.0, 0.0, length(edges) - 6.0 + (noise(p / 9.0) - 0.5) * 12.0);
  float rubbed = (1.0 - smoothstep(0.5, 3.2, edge)) * (0.55 + 0.45 * noise(p / 18.0));
  float scuffs = smoothstep(0.74, 0.88, fbm(p / 40.0 + uSeed * 7.0)) * 0.22;
  float spineFold = exp(-pow((p.x - 20.0) / 2.5, 2.0)) * smoothstep(0.45, 0.7, noise(p / 5.0));
  return clamp(max(max(rubbed, corner * 0.9), max(scuffs, spineFold)), 0.0, 1.0);
}
