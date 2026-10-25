float grainMask(vec3 albedo) {
  float lit = luminance(albedo);
  return smoothstep(0.08, 0.45, lit) * 0.65 + 0.35 * step(0.45, lit);
}

vec3 plasticGrain(vec3 albedo, vec2 px, float grain, float notCap) {
  vec3 tint = vec3(noise(px / 3.6 + 1.3), noise(px / 3.6 + 4.9), noise(px / 3.6 + 8.1)) - 0.5;
  float coarse = (noise(px / 3.8 + 3.3) - 0.5) * 0.85 + (noise(px / 15.0 + 9.1) - 0.5) * 0.6;
  float blotch = noise(px * 0.035) + noise(px * 0.011) - 1.0;
  float chromaBlotch = noise(px * 0.06 + 7.0) - 0.5;
  vec2 mottle = vec2(noise(px / 9.0 + 4.4) + noise(px / 22.0 + 1.9) - 1.0, noise(px / 14.0 + 8.8) - 0.5);
  float cell = hash(floor(px / 1.4) + 11.7) - 0.5;
  albedo *= 1.0 + (tint * vec3(0.15, 0.08, 0.13) + cell * 0.035 + coarse * vec3(0.11, 0.08, 0.1)
    + blotch * vec3(0.09, 0.09, 0.08) + chromaBlotch * vec3(0.11, -0.03, 0.04)
    + mottle.x * vec3(0.07, 0.07, 0.065) + mottle.y * vec3(0.06, 0.02, -0.05)) * grain;
  albedo *= 1.0 + ((noise(px / 85.0 + 2.0) - 0.5) * 0.12 + (noise(px / 26.0 + 6.0) - 0.5) * 0.07) * notCap;
  albedo += step(0.976, hash(floor(px / 1.6) + 31.7)) * 0.16 * grain;
  albedo *= 1.0 - step(0.993, hash(floor(px / 1.7) + 77.3)) * 0.14 * grain * vec3(0.9, 1.0, 1.0);
  return albedo;
}

vec3 grainNormal(vec3 n, vec2 px, float grain) {
  vec2 fine = vec2(noise(px / 2.2), noise(px / 2.2 + 7.13)) - 0.5;
  vec2 soft = vec2(noise(px * 0.45), noise(px * 0.45 + 19.7)) - 0.5;
  return normalize(n + vec3((fine * 0.12 + soft * 0.18) * grain + soft * 0.03, 0.0));
}
