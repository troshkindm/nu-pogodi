void nearestCap(vec2 px, out float distance, out float index) {
  distance = 1.0;
  index = 0.0;
  for (int i = 0; i < 4; i++) {
    float t = length(px - uCaps[i].xy) / uCaps[i].z;
    if (t < distance) {
      distance = t;
      index = float(i);
    }
  }
}

vec3 capAlbedo(vec2 px, float t, float index) {
  float wear = hash(vec2(index * 7.1, 3.3));
  vec3 center = vec3(0.024, 0.023, 0.034) * (0.85 + 0.3 * wear);
  vec3 rim = vec3(0.007, 0.007, 0.009);
  float speckle = 1.0 + (noise(px / 5.0 + index * 13.0) - 0.5) * 0.5 + (hash(floor(px / 1.3)) - 0.5) * 0.4;
  return mix(center, rim, smoothstep(0.25, 0.97, t)) * speckle;
}

const vec3 PILL_ALBEDO = vec3(0.218, 0.19, 0.227);
