float segmentAt(vec2 uv) {
  float current = texture2D(uSegmentsCurrent, uv).a;
  float previous = texture2D(uSegmentsPrevious, uv).a;
  return current > previous ? mix(previous, current, min(1.0, uFade * 4.2)) : mix(previous, current, uFade);
}

vec3 lcdBacking(vec4 backing) {
  vec3 back = pow(backing.rgb, vec3(2.2));
  return mix(back, vec3(luminance(back)), 0.1) * vec3(0.985, 1.0, 0.955);
}

vec3 castInkShadow(vec3 back, vec2 uv) {
  vec2 texel = 1.0 / uSize;
  vec2 offset = uv - vec2(7.0, 7.7) * texel;
  float ring = 0.0;
  float printRing = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 o = offset + vec2(cos(a), sin(a)) * 3.8 * texel;
    ring += segmentAt(o);
    printRing += texture2D(uPrint, o).a;
  }
  float segmentShadow = ring / 8.0 * 0.6 + segmentAt(offset) * 0.4;
  float printShadow = printRing / 8.0 * 0.6 + texture2D(uPrint, offset).a * 0.4;
  return mix(back, back * vec3(0.42, 0.45, 0.38), 0.75 * max(segmentShadow, printShadow));
}

vec3 lcdColor(vec4 backing, vec2 uv, float shadow, float ao) {
  vec3 back = lcdBacking(backing);
#ifdef LCD_SHADOWS
  back = castInkShadow(back, uv);
#endif
  float ink = segmentAt(uv);
  vec3 color = mix(back, vec3(0.0004), ink * 0.996);
  color *= (0.84 + 0.16 * shadow) * mix(1.0, ao, 0.3);
  float sheen = 0.018 * (1.0 - smoothstep(0.0, 0.75, length((uv - vec2(0.3, 0.22)) * vec2(1.0, 1.5))));
  return color + sheen * vec3(1.0, 1.0, 0.98) * (1.0 - ink);
}
