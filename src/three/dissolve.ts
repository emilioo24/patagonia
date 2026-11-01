import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  Points,
  ShaderMaterial,
  type Group,
  type Material,
} from 'three';

/** Mismo reparto que usa el shader: de abajo hacia arriba, con ruido. */
export const MORPH_SWEEP = 0.45;
export const MORPH_FREQUENCY = 6;
/** Grano fino, para que se lea como un fade sin borde visible. */
export const FADE_FREQUENCY = 190;

export interface DissolveUniforms {
  uDProgress: { value: number };
  /** 0: desaparece a medida que sube. 1: aparece a medida que sube. */
  uDMode: { value: number };
  uDEdge: { value: number };
  uDFrequency: { value: number };
  uDSweep: { value: number };
  uDHeight: { value: number };
}

const VERTEX_HEADER = /* glsl */ `
  varying vec3 vDPosition;
`;

const FRAGMENT_HEADER = /* glsl */ `
  uniform float uDProgress;
  uniform float uDMode;
  uniform float uDEdge;
  uniform float uDFrequency;
  uniform float uDSweep;
  uniform float uDHeight;
  varying vec3 vDPosition;
  float dEdgeGlow = 0.0;

  float dHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float dNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x), mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x), mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }
`;

const FRAGMENT_DISCARD = /* glsl */ `
  // Saltea el ruido cuando el envase se ve entero
  bool dIdle = (uDMode < 0.5 && uDProgress <= 0.0) || (uDMode > 0.5 && uDProgress >= 1.0);
  if (!dIdle) {
    vec3 dPoint = vDPosition * uDFrequency;
    float dValue = dNoise(dPoint) * 0.65 + dNoise(dPoint * 2.3) * 0.35;
    dValue = mix(dValue, clamp(vDPosition.y / uDHeight, 0.0, 1.0), uDSweep);
    float dLimit = uDProgress * 1.1 - 0.05;
    if (uDMode < 0.5 ? dValue < dLimit : dValue > dLimit) discard;
    // Borde brillante del lado donde se está cortando
    float dDistance = abs(dValue - dLimit);
    dEdgeGlow = uDEdge * (1.0 - smoothstep(0.0, 0.035, dDistance));
  }
`;

/**
 * Agrega la disolución a todos los materiales de un envase. Usa la posición del
 * vértice en el objeto, así que todas las partes tienen que tener su posición
 * en la geometría y no en el mesh.
 */
export function applyDissolve(group: Group, height: number): DissolveUniforms {
  const uniforms: DissolveUniforms = {
    uDProgress: { value: 0 },
    uDMode: { value: 0 },
    uDEdge: { value: 0 },
    uDFrequency: { value: MORPH_FREQUENCY },
    uDSweep: { value: 0 },
    uDHeight: { value: height },
  };

  const patched = new Set<Material>();
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material as Material;
    if (patched.has(material)) return;
    patched.add(material);

    const previous = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERTEX_HEADER}`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDPosition = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FRAGMENT_HEADER}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAGMENT_DISCARD}`)
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.68, 0.24) * dEdgeGlow * 4.0;',
        );
    };
    material.customProgramCacheKey = () => `${previousKey()}|dissolve`;
    material.needsUpdate = true;
  });

  return uniforms;
}

export function setDissolve(
  uniforms: DissolveUniforms,
  options: { progress: number; appearing: boolean; morph: boolean },
) {
  uniforms.uDProgress.value = options.progress;
  uniforms.uDMode.value = options.appearing ? 1 : 0;
  uniforms.uDEdge.value = options.morph ? 1 : 0;
  uniforms.uDFrequency.value = options.morph ? MORPH_FREQUENCY : FADE_FREQUENCY;
  uniforms.uDSweep.value = options.morph ? MORPH_SWEEP : 0;
}

/**
 * Chispas que se desprenden de la lata. Cada una nace cuando el borde de la
 * disolución pasa por su altura, y su posición sale solo del progreso, así que
 * el scroll hacia arriba las devuelve a su lugar.
 */
export function createDissolveSparks(count: number, radius: number, height: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const y = Math.random();
    positions[i * 3] = Math.sin(angle) * radius;
    positions[i * 3 + 1] = (y - 0.5) * height;
    positions[i * 3 + 2] = Math.cos(angle) * radius;

    const birth = (Math.random() * (1 - MORPH_SWEEP) + y * MORPH_SWEEP) * 0.92;
    seeds[i * 4] = birth;
    seeds[i * 4 + 1] = 0.12 + Math.random() * 0.2; // vida
    seeds[i * 4 + 2] = 0.25 + Math.random() * 0.6; // distancia
    seeds[i * 4 + 3] = 0.5 + Math.random(); // tamaño
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uProgress: { value: 0 },
      uPixelSize: { value: 40 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uProgress;
      uniform float uPixelSize;
      varying float vLife;

      void main() {
        float age = (uProgress - aSeed.x) / aSeed.y;
        if (age <= 0.0 || age >= 1.0) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          vLife = 0.0;
          return;
        }
        vec3 outward = normalize(vec3(position.x, 0.0, position.z));
        vec3 moved = position + outward * aSeed.z * age;
        moved.y += age * age * aSeed.z * 0.9;
        moved.x += sin(age * 9.0 + aSeed.w * 6.0) * 0.03;
        vec4 view = modelViewMatrix * vec4(moved, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = uPixelSize * aSeed.w * (1.0 - age * 0.6) / -view.z;
        vLife = 1.0 - age;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;

      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        float glow = smoothstep(0.5, 0.0, distanceToCenter);
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.3) * glow * vLife, glow * vLife);
        #include <colorspace_fragment>
      }
    `,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  return { points, uniforms: material.uniforms as { uProgress: { value: number }; uPixelSize: { value: number } } };
}
