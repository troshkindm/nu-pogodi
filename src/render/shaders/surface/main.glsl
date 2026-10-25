void main() {
  vec2 px = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec2 uv = px / uSize;

#ifdef EDGE_WOBBLE
  vec2 warp = edgeWobble(px);
#else
  vec2 warp = vec2(0.0);
#endif
  vec2 warpedUv = (px + warp) / uSize;
  vec4 albedoSample = texture2D(uAlbedo, warpedUv);
  vec3 albedo = pow(albedoSample.rgb, vec3(2.2));
  vec3 material = texture2D(uMaterial, warpedUv).rgb;

  float inside;
  float keyHeight = capHeight(px, inside);
  float baseHeight = texture2D(uHeight, warpedUv).r;
  bool raised = inside > 0.5 && keyHeight > baseHeight;
  float onCap = raised && inside < 1.5 ? 1.0 : 0.0;
  float onPill = raised && inside > 1.5 ? 1.0 : 0.0;
  float notCap = raised ? 0.0 : 1.0;
  float press = raised ? pressAt(px) : 0.0;
  float capT = 1.0;
  float capIndex = 0.0;
  if (onCap > 0.5) {
    nearestCap(px, capT, capIndex);
    albedo = capAlbedo(px, capT, capIndex);
    material = vec3(0.6, 0.5, 0.0);
  } else if (onPill > 0.5) {
    albedo = PILL_ALBEDO;
    material = vec3(0.5, 0.5, 0.03);
  }
  float h0 = max(baseHeight, keyHeight);
  vec3 n = surfaceNormal(px, warp);
  float grainAmount = material.b * grainMask(albedo);

#ifdef PLASTIC_GRAIN
  albedo = plasticGrain(albedo, px, grainAmount, notCap);
#endif
  float scratch = 0.0;
#ifdef WEAR
  albedo = applyWear(albedo, material, scratch, px, uv, h0, notCap, onCap);
#endif
#ifdef PLASTIC_GRAIN
  n = grainNormal(n, px, grainAmount);
#endif

  vec3 light = normalize(uKey);
  vec3 flash = normalize(uFlash);
#ifdef SHADOWS
  float shadow = rayShadow(px, h0, light);
#else
  float shadow = 1.0;
#endif
#ifdef AMBIENT_OCCLUSION
  float ao = ambientOcclusion(px, h0);
#else
  float ao = 1.0;
#endif

  vec3 diffuse = uAmbient * ao + uKeyColor * max(dot(n, light), 0.0) * shadow + uFlashColor * max(dot(n, flash), 0.0) * ao;
  vec3 color = albedo * diffuse * (1.0 - 0.2 * press);

  float specular = baseSpecular(n, material, light, flash, shadow, onCap);
  specular *= 1.0 - onCap * smoothstep(0.76, 0.9, capT);
  specular += onCap * capHighlight(px, n, light, flash, capT, capIndex);
#ifdef CAP_REFLECTIONS
  specular += onCap * capReflection(px, n, capT, capIndex);
  specular += onPill * pillReflection(n);
#endif
#ifdef WEAR
  specular += scratch * (0.1 + 0.12 * onCap) * pow(max(dot(n, normalize(light + VIEWER)), 0.0), 8.0) * shadow;
#endif
#ifdef GLINTS
  specular += sparkle(px, light, flash, shadow, material.b);
#endif
  color += vec3(specular * (1.0 - 0.55 * press)) * vec3(1.0, 0.98, 0.96);

  vec4 lcdBack = texture2D(uLcd, uv);
  if (lcdBack.a > 0.001) color = mix(color, lcdColor(lcdBack, uv, shadow, ao), lcdBack.a);

  color = color * (1.0 + color / 6.0) / (1.0 + color);
  color = pow(color * 1.32, vec3(1.0 / 2.2));
  gl_FragColor = vec4(color * albedoSample.a, albedoSample.a);
}
