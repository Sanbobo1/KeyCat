// Fur: flat sticker colour plus the markings that make a coat read as a real cat — a pale muzzle
// and bib, pink inner ears, tabby stripes, calico patches, a grey-and-white's white mask — and a
// soft top-left shade for volume.
// Markings are placed in each part's rest shape, so they stay put when the spine bends.
'use strict';
(() => {
  const C = c => new THREE.Color(c);
  // Shared by every fur material, so a coat change is one set of writes.
  const U = {
    uFur: { value: C('#151515') },
    uLight: { value: C('#f7f4ea') },     // muzzle, bib, tuxedo white
    uDark: { value: C('#151515') },      // tabby stripes
    uPatchA: { value: C('#151515') },    // calico patches
    uPatchB: { value: C('#151515') },
    uInner: { value: C('#151515') },     // inner ear
    uStripes: { value: 0 },
    uMuzzle: { value: 0 },
    uBib: { value: 0 },
    uCalico: { value: 0 },
    uTuxedo: { value: 0 },
    uMask: { value: 0 },                // grey-and-white: white face centre, chest and forelegs
    uEarTip: { value: 0 },              // white tuft on the tip of the left ear
    uInnerAmt: { value: 0 },
    uInnerWide: { value: 0 },            // inner ear fills most of the ear
    uShade: { value: 0 },
  };

  const vertex = `
    attribute vec3 rest;
    attribute float along;
    varying vec3 vRest;
    varying vec3 vNormal;
    varying float vAlong;
    void main() {
      #ifdef BODY
        vRest = rest;
      #else
        vRest = position;
      #endif
      vAlong = along;
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      #ifdef ARM
        ${K.ARM_ROOT_PUSH}
      #endif
      gl_Position = projectionMatrix * mv;
    }`;

  const fragment = `
    uniform vec3 uFur, uLight, uDark, uPatchA, uPatchB, uInner;
    uniform float uStripes, uMuzzle, uBib, uCalico, uTuxedo, uMask, uEarTip, uInnerAmt, uInnerWide, uShade;
    varying vec3 vRest;
    varying vec3 vNormal;
    varying float vAlong;
    // Soft-edged ellipse: 1 inside, 0 outside, with a thin anti-aliased edge.
    // Edges are only a pixel or two wide: flat colour shapes, as in a 2D illustration.
    float blob(vec2 p, vec2 c, vec2 r) { return 1.0 - smoothstep(0.96, 1.0, length((p - c) / r)); }
    float blob3(vec3 p, vec3 c, float r) { return 1.0 - smoothstep(r * 0.97, r, length(p - c)); }
    // A tapering line from a to b, half-width w at a, w * taper at b.
    float stroke(vec2 p, vec2 a, vec2 b, float w, float taper) {
      vec2 ab = b - a;
      float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
      float r = w * mix(1.0, taper, h);
      return 1.0 - smoothstep(r * 0.88, r, length(p - a - ab * h));
    }
    // Rings across a 0..1 coordinate: n bands, each \`fill\` of a period wide.
    float rings(float x, float n, float fill) {
      float f = fract(x * n);
      float d = abs(f - 0.5);
      return 1.0 - smoothstep(fill * 0.5 - 0.025, fill * 0.5, d);
    }
    void main() {
      vec3 col = uFur;
      vec3 p = vRest;
      float light = 0.0, dark = 0.0, inner = 0.0;
      #ifdef HEAD
        // Head geometry is a unit sphere scaled (0.56, 0.47, 0.47) by the mesh.
        if (p.z > 0.0) {
          vec2 q = p.xy;
          // Two lobes under the nose and a little chin: the classic pale cat muzzle.
          float m = max(max(blob(q, vec2(-0.2, -0.47), vec2(0.27, 0.22)), blob(q, vec2(0.2, -0.47), vec2(0.27, 0.22))),
                        blob(q, vec2(0.0, -0.66), vec2(0.26, 0.18)));
          light = max(light, m * uMuzzle);
          // Tuxedo blaze: the muzzle widens and runs up between the eyes.
          float blaze = max(m, blob(q, vec2(0.0, -0.1), vec2(0.12, 0.42)) * step(q.y, 0.35));
          light = max(light, blaze * uTuxedo);
          // Grey-and-white: the coat's colour is a cap over the brow and both eye sockets. A
          // narrow white wedge runs from the forehead down between the eyes and opens out under
          // them, which leaves the colour as a stripe over each cheek bone, ending at the jowl.
          float v = 0.42 * (0.4 - q.y);
          float wedge = (1.0 - smoothstep(v * 0.9, v, abs(q.x))) * step(0.0, v);
          float jowl = -0.25 - 0.82 * (abs(q.x) - 0.3);
          light = max(light, max(wedge, 1.0 - smoothstep(jowl - 0.02, jowl + 0.02, q.y)) * uMask);
          // Tabby "M" on the forehead and streaks running back from the eyes.
          float mk = stroke(q, vec2(0.0, 0.42), vec2(0.0, 0.85), 0.07, 0.55);
          mk = max(mk, stroke(vec2(abs(q.x), q.y), vec2(0.15, 0.4), vec2(0.27, 0.84), 0.06, 0.45));
          mk = max(mk, stroke(vec2(abs(q.x), q.y), vec2(0.72, 0.05), vec2(0.98, 0.16), 0.055, 0.4));
          mk = max(mk, stroke(vec2(abs(q.x), q.y), vec2(0.74, -0.16), vec2(0.99, -0.12), 0.05, 0.4));
          dark = max(dark, mk * uStripes);
        }
        // Calico: an orange patch over the left brow and ear, a black one over the right.
        float pa = blob3(p, vec3(-0.6, 0.7, 0.35), 0.62);
        float pb = blob3(p, vec3(0.72, 0.55, 0.1), 0.55);
      #endif
      #ifdef BODY
        // Lathe body: y is height, angle from the front is atan(x, z).
        float a = abs(atan(p.x, p.z));
        float bibW = mix(0.55, 0.85, smoothstep(0.75, 1.2, p.y));
        float bib = 1.0 - smoothstep(bibW * 0.96, bibW, a);
        light = max(light, bib * max(uBib, uTuxedo));
        // Grey-and-white: the body is white but for the coat's colour in three patches at its
        // sides, widest at the silhouette. 'up' runs from the seat (0) to the neck (1): a teardrop
        // on the left flank, wide where it ends low down; a large one where the tail starts; and a
        // thin one at the right of the neck.
        float side = atan(p.x, p.z), up = p.y / 1.32;
        float lt = mix(0.75, 1.17, smoothstep(0.42, 0.74, up));
        float flank = smoothstep(lt, lt + 0.05, -side) * smoothstep(0.38, 0.42, up) * (1.0 - smoothstep(0.74, 0.78, up));
        flank = max(flank, smoothstep(0.78, 0.83, side) * smoothstep(0.1, 0.14, up) * (1.0 - smoothstep(0.5, 0.54, up)));
        flank = max(flank, smoothstep(0.94, 0.99, side) * smoothstep(0.72, 0.76, up));
        light = max(light, uMask * (1.0 - flank));
        // Mackerel stripes wrap round the flanks and back, stopping short of the chest. They taper
        // to a point where they stop rather than fading, like brush strokes.
        float wave = p.y + 0.05 * sin(a * 3.0);
        float reach = smoothstep(0.62, 1.1, a);
        float band = rings(wave, 6.5, 0.36 * reach) * step(0.3, p.y) * step(p.y, 1.2);
        dark = max(dark, band * uStripes);
        float pa = blob3(p, vec3(-0.5, 0.95, -0.3), 0.55);
        float pb = blob3(p, vec3(0.55, 0.55, -0.15), 0.5) * (1.0 - bib);
      #endif
      #ifdef EAR
        // Ear lathe: radius shrinks from 0.28 at the base to 0 at the tip (y 0.37).
        // Every point lies on the lathe radius, so the inner ear is a band across the front face.
        float rMax = mix(0.28, 0.0, clamp((p.y + 0.06) / 0.43, 0.0, 1.0));
        // Most coats have a band of pink across the ear; 'innerWide' fills most of the ear.
        float wf = mix(0.52, 0.78, uInnerWide), lo = mix(0.13, 0.0, uInnerWide);
        inner = (1.0 - smoothstep(wf, wf + 0.06, abs(p.x) / max(rMax, 0.001))) * smoothstep(lo, lo + 0.01, p.y) * (1.0 - smoothstep(0.3, 0.31, p.y)) * step(0.0, p.z);
        #ifdef LEFT
          float pa = 1.0, pb = 0.0;
          // A small tuft of white fur on the very tip of this ear (see 'earTip' in a coat), above
          // the inner ear. Its edge is slightly slanted and soft, so it reads as fur.
          float tipY = 0.31 + 0.25 * p.x;
          light = max(light, smoothstep(tipY, tipY + 0.03, p.y) * uEarTip);
        #else
          float pa = 0.0, pb = 1.0;
        #endif
      #endif
      #ifdef TAIL
        // Rings down the tail, a dark tip; calico tails are black with one orange band.
        dark = max(dark, rings(vAlong, 5.0, 0.42) * step(0.2, vAlong) * uStripes);
        dark = max(dark, smoothstep(0.9, 0.91, vAlong) * uStripes);
        float pa = rings(vAlong + 0.12, 1.0, 0.3), pb = 1.0 - pa;
      #endif
      #ifdef ARM
        dark = max(dark, rings(vAlong, 3.0, 0.38) * step(0.4, vAlong) * uStripes);
        // Grey-and-white forelegs are white.
        light = max(light, uMask);
        // Calico forelegs are white, as on most real calicos.
        float pa = 0.0, pb = 0.0;
      #endif
      col = mix(col, uPatchA, pa * uCalico);
      col = mix(col, uPatchB, pb * uCalico);
      col = mix(col, uDark, dark);
      col = mix(col, uLight, light);
      col = mix(col, uInner, inner * uInnerAmt);
      // Soft volume: lit from the top left, a touch darker towards the silhouette and underneath.
      vec3 n = normalize(vNormal);
      // Only the sides darken: a dark top edge would draw a seam where the ears meet the head.
      float lit = dot(n, normalize(vec3(-0.35, 0.75, 0.55)));
      float edge = (1.0 - clamp(n.z, 0.0, 1.0)) * abs(n.x);
      col *= 1.0 + uShade * (0.18 * lit - 0.4 * edge * edge - 0.05);
      gl_FragColor = vec4(col, 1.0);
    }`;

  // `part` picks the markings: 'HEAD', 'BODY', 'EAR', 'TAIL' or 'ARM'; `side` -1 is screen left.
  K.furMaterial = (part, side = 0) => {
    const defines = { [part]: 1 };
    if (side < 0) defines.LEFT = 1;
    return new THREE.ShaderMaterial({ uniforms: U, vertexShader: vertex, fragmentShader: fragment, defines });
  };

  // Writes a coat: colours plus how strongly each marking shows (0 hides it).
  K.setFur = f => {
    for (const k of ['fur', 'light', 'dark', 'patchA', 'patchB', 'inner']) U['u' + k[0].toUpperCase() + k.slice(1)].value.set(f[k] || f.fur);
    for (const k of ['stripes', 'muzzle', 'bib', 'calico', 'tuxedo', 'mask', 'earTip', 'innerAmt', 'innerWide', 'shade']) U['u' + k[0].toUpperCase() + k.slice(1)].value = f[k] || 0;
  };
})();
