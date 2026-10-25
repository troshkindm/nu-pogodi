float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + 17.1;
    amplitude *= 0.5;
  }
  return value;
}

float fromSpine(vec2 p) {
  return mix(p.x, PAGE.x - p.x, uSpine);
}

vec2 toUv(vec2 p) {
  return p / PAGE;
}

float crease(vec2 p, vec2 origin, float angle, float span, float width) {
  vec2 direction = vec2(cos(angle), sin(angle));
  vec2 offset = p - origin;
  float along = dot(offset, direction);
  float across = dot(offset, vec2(-direction.y, direction.x));
  float fade = smoothstep(0.0, span * 0.3, along) * smoothstep(span, span * 0.6, along);
  return exp(-across * across / (width * width)) * fade;
}

float creases(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < 3; i++) {
    float k = float(i) + uSeed * 3.1;
    vec2 origin = vec2(hash(vec2(k, 1.3)), hash(vec2(k, 7.9))) * PAGE;
    float angle = hash(vec2(k, 4.4)) * 6.2832;
    h += (hash(vec2(k, 9.2)) - 0.5) * 1.6 * crease(p, origin, angle, 160.0 + 260.0 * hash(vec2(k, 2.2)), 3.0);
  }
  return h;
}

float paperHeight(vec2 p) {
  float h = (fbm(p / 300.0 + uSeed) - 0.5) * 10.0;
  h += (fbm(p / 60.0 + uSeed * 1.7) - 0.5) * 1.8;
  h += (noise(p / 2.6) - 0.5) * 0.22 + (noise(p * 0.9) - 0.5) * 0.08;
  h += creases(p);
  h -= 24.0 * exp(-fromSpine(p) / 34.0) * (1.0 - uCover);
  h -= 0.8 * texture2D(uPen, toUv(p)).a;
  return h;
}

vec3 paperNormal(vec2 p) {
  float e = 1.2;
  float dx = paperHeight(p + vec2(e, 0.0)) - paperHeight(p - vec2(e, 0.0));
  float dy = paperHeight(p + vec2(0.0, e)) - paperHeight(p - vec2(0.0, e));
  return normalize(vec3(-dx / (2.0 * e), -dy / (2.0 * e), 1.0));
}
