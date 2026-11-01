import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector4,
  VideoTexture,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import type { BackgroundLayers } from '../backgrounds/layer';

const DISTANCE = 30;
const SCRIM = 0.6;

function gradientTexture(stops: string[]): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  stops.forEach((stop, i) => gradient.addColorStop(i / Math.max(stops.length - 1, 1), stop));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function mediaTexture(element: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Texture {
  const texture = element instanceof HTMLVideoElement ? new VideoTexture(element) : new Texture(element);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  return texture;
}

function mediaAspect(element: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): number {
  if (element instanceof HTMLImageElement) return element.naturalWidth / element.naturalHeight;
  if (element instanceof HTMLVideoElement) return element.videoWidth / element.videoHeight;
  return element.width / element.height;
}

/**
 * Plano a pantalla completa con los fondos del recorrido. Mezcla dos texturas
 * en el shader, con el mismo mix que calcula la capa de fondos. Es opaco, así
 * que entra en el pase de transmission y el vidrio lo refracta.
 */
export function createJourneyBackdrop(scene: Scene, camera: PerspectiveCamera, background: BackgroundLayers) {
  const material = new ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    uniforms: {
      uA: { value: null as Texture | null },
      uB: { value: null as Texture | null },
      uCoverA: { value: new Vector4(1, 1, 0, 0) },
      uCoverB: { value: new Vector4(1, 1, 0, 0) },
      uMix: { value: 0 },
      uScrimA: { value: 0 },
      uScrimB: { value: 0 },
      uPortrait: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uA;
      uniform sampler2D uB;
      uniform vec4 uCoverA;
      uniform vec4 uCoverB;
      uniform float uMix;
      uniform float uScrimA;
      uniform float uScrimB;
      uniform float uPortrait;
      varying vec2 vUv;

      void main() {
        vec3 a = texture2D(uA, vUv * uCoverA.xy + uCoverA.zw).rgb;
        vec3 b = texture2D(uB, vUv * uCoverB.xy + uCoverB.zw).rgb;

        // Oscurece la foto del lado del texto: arriba en celular, a la izquierda en escritorio
        float side = uPortrait > 0.5
          ? smoothstep(0.5, 1.0, vUv.y)
          : 1.0 - smoothstep(0.0, 0.62, vUv.x);
        a *= 1.0 - uScrimA * side;
        b *= 1.0 - uScrimB * side;

        gl_FragColor = vec4(mix(a, b, uMix), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  const plane = new Mesh(new PlaneGeometry(1, 1), material);
  plane.position.z = -DISTANCE;
  plane.renderOrder = -1;
  plane.frustumCulled = false;
  camera.add(plane);
  scene.add(camera);

  const entries = background.layers.map((layer) => ({
    layer,
    gradient: gradientTexture(layer.gradient?.stops ?? ['#121414', '#121414']),
    media: undefined as Texture | undefined,
    uploadedVersion: 0,
  }));

  const applyEntry = (
    entry: (typeof entries)[number],
    texture: { value: Texture | null },
    cover: { value: Vector4 },
    scrim: { value: number },
  ) => {
    const { layer } = entry;
    const element = layer.renderer.element;

    if (!element || !layer.renderer.ready()) {
      texture.value = entry.gradient;
      cover.value.set(1, 1, 0, 0);
      scrim.value = 0;
      return;
    }

    entry.media ??= mediaTexture(element);
    const version = layer.renderer.version();
    if (version !== entry.uploadedVersion) {
      entry.uploadedVersion = version;
      entry.media.needsUpdate = true;
    }
    texture.value = entry.media;

    // Equivalente a object-fit: cover, más el parallax
    const ratio = camera.aspect / mediaAspect(element);
    const zoom = 1 + layer.parallax * 1.5;
    const repeatX = Math.min(ratio, 1) / zoom;
    const repeatY = Math.min(1 / ratio, 1) / zoom;
    const shift = (0.5 - layer.local) * layer.parallax * repeatY;
    cover.value.set(repeatX, repeatY, (1 - repeatX) / 2, (1 - repeatY) / 2 + shift);
    scrim.value = layer.isImage ? SCRIM : 0;
  };

  return {
    /** `scrim` escala el oscurecimiento: sin texto encima, la foto se ve limpia. */
    update(scrim = 1) {
      const height = 2 * DISTANCE * Math.tan((camera.fov * Math.PI) / 360);
      plane.scale.set(height * camera.aspect, height, 1);

      const { uniforms } = material;
      uniforms.uPortrait.value = camera.aspect < 0.85 ? 1 : 0;
      uniforms.uMix.value = background.active.mix;
      applyEntry(entries[background.active.lower], uniforms.uA, uniforms.uCoverA, uniforms.uScrimA);
      applyEntry(entries[background.active.upper], uniforms.uB, uniforms.uCoverB, uniforms.uScrimB);
      uniforms.uScrimA.value *= scrim;
      uniforms.uScrimB.value *= scrim;
    },
  };
}
