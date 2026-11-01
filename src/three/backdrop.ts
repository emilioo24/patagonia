import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  type PerspectiveCamera,
  type Scene,
  type Texture,
} from 'three';

const DISTANCE = 30;

/**
 * Plano a pantalla completa pegado a la cámara. Al estar dentro de la escena,
 * el vidrio con transmission lo refracta; con un canvas transparente vería negro.
 */
export function createBackdrop(scene: Scene, camera: PerspectiveCamera) {
  const material = new MeshBasicMaterial({ toneMapped: false, depthWrite: false });
  const plane = new Mesh(new PlaneGeometry(1, 1), material);
  plane.position.z = -DISTANCE;
  plane.renderOrder = -1;
  plane.frustumCulled = false;
  camera.add(plane);
  scene.add(camera);

  const fit = () => {
    const height = 2 * DISTANCE * Math.tan((camera.fov * Math.PI) / 360);
    plane.scale.set(height * camera.aspect, height, 1);

    // Equivalente a object-fit: cover
    const texture = material.map;
    const image = texture?.image as { width: number; height: number } | undefined;
    if (!texture || !image) return;
    const ratio = camera.aspect / (image.width / image.height);
    texture.repeat.set(Math.min(ratio, 1), Math.min(1 / ratio, 1));
    texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
  };

  const setTexture = (texture: Texture) => {
    texture.colorSpace = SRGBColorSpace;
    material.map = texture;
    material.needsUpdate = true;
    fit();
  };

  return {
    fit,
    setColor(color: string) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 2, 2);
      setTexture(new CanvasTexture(canvas));
    },
    async setImage(src: string) {
      setTexture(await new TextureLoader().loadAsync(src));
    },
  };
}
