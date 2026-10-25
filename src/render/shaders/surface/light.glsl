const vec3 VIEWER = vec3(0.0, 0.0, 1.0);

float rayShadow(vec2 px, float h0, vec3 light) {
  vec2 direction = normalize(light.xy);
  float slope = light.z / length(light.xy);
  float shadow = 1.0;
  for (int i = 1; i <= 30; i++) {
    float t = float(i) * 1.6;
    float rise = occluderHeight(px + direction * t) * uHeightScale - (h0 * uHeightScale + t * slope);
    shadow = min(shadow, clamp(1.0 - rise / (0.07 * t + 0.4), 0.0, 1.0));
  }
  return shadow;
}

float ambientOcclusion(vec2 px, float h0) {
  float occlusion = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 o = vec2(cos(a), sin(a));
    occlusion += max(0.0, occluderHeight(px + o * 5.0) * uHeightScale - h0 * uHeightScale) / 5.0;
    occlusion += max(0.0, min(heightAt(px + o * 16.0), OCCLUDER_CLAMP) * uHeightScale - h0 * uHeightScale) / 16.0;
  }
  return clamp(1.0 - occlusion * 0.04, 0.5, 1.0);
}

float baseSpecular(vec3 n, vec3 material, vec3 light, vec3 flash, float shadow, float onCap) {
  float shininess = mix(6.0, 120.0, material.g);
  float key = pow(max(dot(n, normalize(light + VIEWER)), 0.0), shininess) * shadow * 0.9;
  float front = pow(max(dot(n, normalize(flash + VIEWER)), 0.0), shininess * 2.0) * 0.25 * (1.0 - 0.85 * onCap);
  return material.r * (key + front);
}

float sparkle(vec2 px, vec3 light, vec3 flash, float shadow, float grainAmount) {
  vec2 cell = floor(px / 1.6);
  if (hash(cell + 2.1) <= 0.8) return 0.0;
  vec3 facet = normalize(vec3((vec2(hash(cell + 5.7), hash(cell + 9.3)) - 0.5) * 1.3, 1.0));
  float key = pow(max(dot(facet, normalize(light + VIEWER)), 0.0), 50.0) * shadow;
  float front = pow(max(dot(facet, normalize(flash + VIEWER)), 0.0), 50.0) * 0.5;
  return (key + front) * grainAmount * 0.2;
}

float capHighlight(vec2 px, vec3 n, vec3 light, vec3 flash, float capT, float capIndex) {
  float flashDot = max(dot(n, normalize(flash + VIEWER)), 0.0);
  float spot = (0.5 + 0.3 * hash(vec2(capIndex, 9.1))) * pow(flashDot, 2200.0) + 0.015 * pow(flashDot, 40.0);
  vec3 keyForCap = px.x > uSize.x * 0.5 ? normalize(vec3(-0.05, -0.62, 0.78)) : light;
  float key = 1.5 * pow(max(dot(n, normalize(keyForCap + VIEWER)), 0.0), 420.0) * smoothstep(0.93, 0.8, capT);
  return spot * smoothstep(0.9, 0.5, capT) + key;
}

float capReflection(vec2 px, vec3 n, float capT, float capIndex) {
  vec3 r = reflect(-VIEWER, n);
  vec2 ray = r.xy / max(r.z, 0.2);
  vec2 boxCenter = px.x > uSize.x * 0.5 ? vec2(0.05, -0.7) : vec2(-0.55, -0.6);
  vec2 jitter = (vec2(hash(vec2(capIndex, 1.7)), hash(vec2(capIndex, 5.3))) - 0.5) * 0.3;
  vec2 box = abs(ray - boxCenter - jitter) - vec2(0.14, 0.08);
  float softbox = 1.0 - smoothstep(0.0, 0.06, length(max(box, 0.0)));
  return (softbox * 0.22 + 0.01 * smoothstep(0.2, -0.9, ray.y)) * smoothstep(0.92, 0.74, capT);
}

float pillReflection(vec3 n) {
  vec3 r = reflect(-VIEWER, n);
  vec2 ray = r.xy / max(r.z, 0.2);
  vec2 box = abs(ray - vec2(-0.12, -0.6)) - vec2(0.5, 0.26);
  return (1.0 - smoothstep(0.0, 0.4, length(max(box, 0.0)))) * 0.24;
}
