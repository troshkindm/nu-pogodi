const vec3 VIEWER = vec3(0.0, 0.0, 1.0);

vec2 outward(vec2 p) {
  return vec2(fromSpine(p), p.y);
}

vec2 inward(vec2 o) {
  return vec2(mix(o.x, PAGE.x - o.x, uSpine), o.y);
}

float foldLine() {
  return PAGE.x + PAGE.y - uCorner;
}

vec2 flapSource(vec2 o) {
  return o + vec2(foldLine() - o.x - o.y);
}

bool insidePage(vec2 o) {
  return o.x <= PAGE.x && o.y <= PAGE.y;
}

vec3 shade(vec3 albedo, vec3 n, float gloss, float occlusion) {
  vec3 light = normalize(uKey);
  vec3 fill = normalize(uFill);
  vec3 diffuse = uAmbient * occlusion + uKeyColor * max(dot(n, light), 0.0) + uFillColor * max(dot(n, fill), 0.0);
  float sheen = 0.035 * pow(max(dot(n, normalize(light + VIEWER)), 0.0), 10.0);
  float penShine = gloss * 0.22 * pow(max(dot(n, normalize(fill + VIEWER)), 0.0), 40.0);
  return albedo * diffuse + vec3(sheen + penShine);
}

vec3 tonemap(vec3 color) {
  color = color * (1.0 + color / 6.0) / (1.0 + color);
  return pow(color * 1.32, vec3(1.0 / 2.2));
}

vec3 cameraNoise(vec3 color) {
  float lum = dot(color, vec3(0.333));
  color += ((noise(gl_FragCoord.xy / 1.8 + uSeed) - 0.5) * 0.8 + (hash(gl_FragCoord.xy + uSeed) - 0.5) * 0.35) * (0.016 - 0.008 * lum);
  vec2 chromaCell = floor(gl_FragCoord.xy / 2.6);
  vec3 blotchy = vec3(hash(chromaCell + 2.2), hash(chromaCell + 6.6), hash(chromaCell + 9.9)) - 0.5;
  return color + (blotchy - vec3(dot(blotchy, vec3(0.333)))) * 0.012;
}

float spreadLight(vec2 p) {
  vec2 spread = vec2(uSpreadX + p.x / PAGE.x, p.y / PAGE.x);
  return mix(1.12, 0.92, smoothstep(0.1, 1.5, length((spread - vec2(0.55, 0.15)) * vec2(0.75, 1.0))));
}

vec3 pageSurface(vec2 p) {
  vec2 uv = toUv(p);
  vec3 albedo = paperAlbedo(p);
  float wear = uCover > 0.5 ? coverWear(p) : 0.0;
  albedo = applyPrint(albedo, p, uv, wear);
  albedo = applyStamp(albedo, p, uv);
  float gloss;
  albedo = applyPen(albedo, p, uv, gloss);
  vec3 n = paperNormal(p);
  float gutter = 1.0 - (1.0 - uCover) * 0.35 * exp(-fromSpine(p) / 26.0);
  return shade(albedo, n, gloss, gutter) * gutter * spreadLight(p);
}

vec3 flapSurface(vec2 p, vec2 source) {
  vec3 albedo = paperAlbedo(source) * 1.03;
  vec4 showThrough = texture2D(uPrint, toUv(source));
  albedo *= 1.0 - showThrough.a * 0.06;
  vec3 n = normalize(vec3(mix(0.28, -0.28, uSpine), 0.28, 1.0));
  return shade(albedo, n, 0.0, 1.0) * spreadLight(p);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) / uScale;
  vec2 o = outward(p);
  float alpha = 1.0;
  vec3 color;

  if (uCorner > 0.0 && o.x + o.y > foldLine()) {
    alpha = 0.0;
    color = vec3(0.0);
  } else {
    vec2 source = flapSource(o);
    bool onFlap = uCorner > 0.0 && insidePage(source) && source.x + source.y > foldLine();
    if (onFlap) {
      color = flapSurface(p, inward(source));
      float edge = min(PAGE.x - source.x, PAGE.y - source.y);
      color *= 0.92 + 0.08 * smoothstep(0.0, 3.0, edge);
    } else {
      color = pageSurface(p);
      if (uCorner > 0.0) {
        vec2 shadowSource = flapSource(o + vec2(5.0, 7.0));
        float shadow = insidePage(shadowSource) && shadowSource.x + shadowSource.y > foldLine() ? 1.0 : 0.0;
        color *= 1.0 - 0.28 * shadow;
      }
    }
  }

  vec3 result = cameraNoise(tonemap(color));
  gl_FragColor = vec4(result * alpha, alpha);
}
