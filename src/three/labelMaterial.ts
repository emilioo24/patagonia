import { MeshPhysicalMaterial, type Texture } from 'three';

/** Material del cuerpo de la lata, con crossfade entre dos etiquetas. */
export function createLabelMaterial(clearcoat: number) {
  const uniforms = {
    uMapB: { value: null as Texture | null },
    uMix: { value: 0 },
  };

  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.6,
    roughness: 0.35,
    clearcoat,
    clearcoatRoughness: 0.3,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMapB = uniforms.uMapB;
    shader.uniforms.uMix = uniforms.uMix;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uMapB;\nuniform float uMix;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          diffuseColor *= mix(texture2D(map, vMapUv), texture2D(uMapB, vMapUv), uMix);
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'label-mix';

  return {
    material,
    set(a: Texture, b?: Texture, mix = 0) {
      if (!material.map) material.needsUpdate = true; // agrega USE_MAP al shader
      material.map = a;
      uniforms.uMapB.value = b ?? a;
      uniforms.uMix.value = b ? mix : 0;
    },
  };
}
