import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';

const UP = new Vector3(0, 1, 0);
const SCROLL_SPEED = 1.8;

function createStreakTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 90; i++) {
    const shade = Math.round(170 + Math.random() * 85);
    ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.55)`;
    ctx.fillRect(Math.random() * 64, Math.random() * 128, 1 + Math.random() * 3, 14 + Math.random() * 40);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Chorro: un cilindro de líquido entre dos puntos, con vetas que bajan. */
export function createPourStream() {
  const geometry = new CylinderGeometry(1, 0.8, 1, 16, 1, true);
  geometry.translate(0, -0.5, 0); // el extremo superior queda en el origen

  const texture = createStreakTexture();
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.18 });
  const mesh = new Mesh(geometry, material);
  mesh.visible = false;
  mesh.frustumCulled = false;

  const direction = new Vector3();
  const rotation = new Quaternion();

  return {
    mesh,
    setColor(color: string) {
      material.color = new Color(color);
      material.emissive = new Color(color).multiplyScalar(0.12);
    },
    /** Lo ubica entre `top` y `bottom`. `radius` en unidades de escena. */
    place(top: Vector3, bottom: Vector3, radius: number) {
      direction.subVectors(top, bottom);
      const length = direction.length();
      mesh.visible = length > 0.001;
      if (!mesh.visible) return;
      mesh.position.copy(top);
      rotation.setFromUnitVectors(UP, direction.divideScalar(length));
      mesh.quaternion.copy(rotation);
      mesh.scale.set(radius, length, radius);
    },
    hide() {
      mesh.visible = false;
    },
    update(dt: number) {
      if (mesh.visible) texture.offset.y += dt * SCROLL_SPEED;
    },
  };
}
