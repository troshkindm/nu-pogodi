float scratchField(vec2 p, float cellSize, float seed) {
  vec2 cell = floor(p / cellSize);
  float strongest = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = cell + vec2(float(i), float(j));
      if (hash(id + seed) > 0.2) continue;
      vec2 center = (id + vec2(hash(id + seed + 1.3), hash(id + seed + 2.7))) * cellSize;
      float angle = -0.35 + (hash(id + seed + 4.1) - 0.5) * 2.4;
      vec2 direction = vec2(cos(angle), sin(angle));
      float len = cellSize * (0.25 + hash(id + seed + 5.9) * 1.1);
      vec2 q = p - center;
      float along = abs(dot(q, direction));
      float across = abs(dot(q, vec2(-direction.y, direction.x)) + sin(along * 0.08 + seed) * 1.2);
      float thickness = hash(id + seed + 7.7);
      float taper = 1.0 - pow(min(along / (len * 0.5), 1.0), 2.0);
      float w = (0.3 + thickness * thickness * 2.0) * taper;
      float mark = smoothstep(w + 0.7, w * 0.3, across) * step(along, len * 0.5);
      float strength = hash(id + seed + 9.1);
      strongest = max(strongest, mark * (0.15 + 0.85 * strength * strength) * (0.5 + 0.5 * noise(p / 3.0 + seed)));
    }
  }
  return strongest;
}

float cavity(vec2 px, float h0) {
  float sum = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982 + 0.39;
    vec2 o = vec2(cos(a), sin(a));
    sum += heightAt(px + o * 2.5) - h0 + 0.5 * (heightAt(px + o * 7.0) - h0);
  }
  return sum;
}

float wearAmount(vec2 px, vec2 uv, out float edgeAge) {
  vec2 edgeDistance = min(uv, 1.0 - uv);
  edgeAge = 1.0 - smoothstep(0.0, 0.07, min(edgeDistance.x, edgeDistance.y * 1.7));
  float nearKeys = 0.0;
  for (int i = 0; i < 4; i++) nearKeys = max(nearKeys, smoothstep(160.0, 50.0, length(px - uCaps[i].xy)));
  return 0.4 + 0.6 * max(edgeAge, nearKeys);
}

vec3 applyWear(vec3 albedo, inout vec3 material, out float scratch, vec2 px, vec2 uv, float h0, float notCap, float onCap) {
  float edgeAge;
  float amount = wearAmount(px, uv, edgeAge);
  float patches = smoothstep(0.25, 0.75, noise(px / 9.3 + 2.0) * 0.6 + noise(px / 31.7 + 4.4) * 0.4);
  float grime = clamp(smoothstep(0.015, 0.1, cavity(px, h0)) * patches * 1.6 * (0.6 + 0.6 * amount), 0.0, 1.0) * notCap;
  albedo = mix(albedo, albedo * vec3(0.5, 0.42, 0.34), grime * 0.7);
  albedo += step(0.96, hash(floor(px / 2.2) + 5.0)) * grime * vec3(0.16, 0.155, 0.15);

  float yellowing = smoothstep(0.45, 0.85, noise(px / 240.0 + 4.0) * 0.65 + noise(px / 70.0 + 1.0) * 0.35) * 0.7;
  float age = clamp(yellowing + edgeAge * 0.6 + smoothstep(0.86, 1.0, uv.y) * 0.3, 0.0, 1.0) * notCap;
  albedo *= mix(vec3(1.0), vec3(1.015, 0.985, 0.9), age);

  scratch = max(scratchField(px, 64.0, 0.0), scratchField(px + 17.0, 26.0, 13.0) * 0.7) * amount;
  albedo += scratch * mix(vec3(0.07, 0.066, 0.07) * notCap, vec3(0.007), onCap);

  float smudge = smoothstep(0.62, 0.8, noise(px / 34.0 + 21.0)) * notCap;
  material.g = mix(material.g, 0.55, smudge * 0.6);
  material.r += smudge * 0.06;

  albedo += onCap * (step(0.982, hash(floor(px / 1.4) + 61.0)) * 0.05 + noise(px / 8.0 + 3.0) * 0.012);
  return albedo;
}
