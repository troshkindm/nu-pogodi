const float PILL_RADIUS = 22.0;
const float OCCLUDER_CLAMP = 0.76;
const float CAP_TRAVEL = 0.09;
const float CAP_SHRINK = 0.03;
const float PILL_TRAVEL = 0.08;

float pillDistance(vec2 px, vec4 pill) {
  return length(max(abs(px - pill.xy) - vec2(pill.z - PILL_RADIUS, 0.0), 0.0));
}

float pillHeight(vec2 px) {
  float h = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 pill = uPills[i];
    float d = pillDistance(px, pill);
    if (d < PILL_RADIUS) {
      float t = d / PILL_RADIUS;
      h = max(h, 0.712 + 0.09 * sqrt(max(0.0, 1.0 - t * t)) - pill.w * PILL_TRAVEL);
    }
  }
  return h;
}

float capHeight(vec2 px, out float inside) {
  float h = 0.0;
  inside = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 cap = uCaps[i];
    float d = length(px - cap.xy);
    float radius = cap.z * (1.0 - CAP_SHRINK * cap.w);
    if (d < radius) {
      inside = 1.0;
      float t = d / radius;
      float rim = smoothstep(1.0, 0.86, t);
      h = max(h, 0.74 + rim * (0.015 + 0.05 * t * t) - cap.w * CAP_TRAVEL);
    }
  }
  float pill = pillHeight(px);
  if (pill > 0.0) inside = 2.0;
  return max(h, pill);
}

float pressAt(vec2 px) {
  float press = 0.0;
  for (int i = 0; i < 4; i++) {
    if (length(px - uCaps[i].xy) < uCaps[i].z) press = uCaps[i].w;
  }
  for (int i = 0; i < 3; i++) {
    if (pillDistance(px, uPills[i]) < PILL_RADIUS) press = uPills[i].w;
  }
  return press;
}

float heightAt(vec2 px) {
  float inside;
  return max(texture2D(uHeight, px / uSize).r, capHeight(px, inside));
}

float warpedHeightAt(vec2 px, vec2 warp) {
  float inside;
  return max(texture2D(uHeight, (px + warp) / uSize).r, capHeight(px, inside));
}

float occluderHeight(vec2 px) {
  return max(min(heightAt(px), OCCLUDER_CLAMP), pillHeight(px));
}

vec3 surfaceNormal(vec2 px, vec2 warp) {
  float left = warpedHeightAt(px + vec2(-1.0, 0.0), warp);
  float right = warpedHeightAt(px + vec2(1.0, 0.0), warp);
  float up = warpedHeightAt(px + vec2(0.0, -1.0), warp);
  float down = warpedHeightAt(px + vec2(0.0, 1.0), warp);
  return normalize(vec3(-(right - left) * 0.5 * uHeightScale, -(down - up) * 0.5 * uHeightScale, 1.0));
}

vec2 edgeWobble(vec2 px) {
  return (vec2(noise(px / 38.0 + 3.1), noise(px / 43.0 + 8.4)) - 0.5) * 2.0
    + (vec2(noise(px / 7.0 + 1.7), noise(px / 9.0 + 5.2)) - 0.5) * 0.6;
}
