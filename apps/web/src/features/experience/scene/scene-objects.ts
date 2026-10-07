import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  type Texture,
} from "three";
import type { ScenePalette } from "./paper-texture";

function roundedShape(width: number, height: number, radius: number) {
  const s = new Shape(),
    x = -width / 2,
    y = -height / 2;
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

export function sceneObjects(texture: Texture, palette: ScenePalette) {
  const group = new Group(),
    paper = new Group();
  group.add(paper);
  paper.position.set(-0.17, 0.08, 0);
  const sheet = (width: number, height: number, color: string, depth: number) =>
    new Mesh(
      new ExtrudeGeometry(roundedShape(width, height, 0.19), {
        depth,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        curveSegments: 14,
      }),
      new MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.12 }),
    );
  const back = sheet(2.83, 3.79, palette.dark, 0.075);
  back.position.set(-0.05, -0.045, -0.24);
  back.rotation.z = -0.09;
  paper.add(back);
  const middle = sheet(2.79, 3.76, palette.edge, 0.045);
  middle.position.set(-0.06, -0.02, -0.12);
  middle.rotation.z = -0.035;
  paper.add(middle);
  paper.add(sheet(2.75, 3.73, palette.paper, 0.08));
  const display = new Mesh(
    new ShapeGeometry(roundedShape(2.68, 3.66, 0.16), 16),
    new MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  const uv = display.geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, (uv.getX(i) + 1.34) / 2.68, (uv.getY(i) + 1.83) / 3.66);
  uv.needsUpdate = true;
  display.position.z = 0.112;
  paper.add(display);
  const metal = new MeshStandardMaterial({ color: palette.edge, metalness: 0.72, roughness: 0.22 });
  const pen = new Group();
  pen.position.set(1.77, -0.2, 0.6);
  pen.rotation.z = -0.22;
  group.add(pen);
  pen.add(new Mesh(new CylinderGeometry(0.075, 0.075, 2.48, 32), metal));
  const cap = new Mesh(
    new CylinderGeometry(0.078, 0.078, 0.4, 32),
    new MeshStandardMaterial({ color: palette.dark, metalness: 0.42, roughness: 0.26 }),
  );
  cap.position.y = 1.09;
  pen.add(cap);
  const nib = new Mesh(new ConeGeometry(0.075, 0.28, 24), metal);
  nib.rotation.z = Math.PI;
  nib.position.y = -1.37;
  pen.add(nib);
  const tip = new Mesh(
    new ConeGeometry(0.018, 0.06, 16),
    new MeshStandardMaterial({ color: palette.dark, roughness: 0.45 }),
  );
  tip.rotation.z = Math.PI;
  tip.position.y = -1.53;
  pen.add(tip);
  const clip = new Mesh(new BoxGeometry(0.025, 0.32, 0.055), metal);
  clip.position.set(0.079, 1.09, 0.045);
  pen.add(clip);
  const clock = new Group();
  clock.position.set(1.64, 1.72, -0.8);
  clock.rotation.set(0.15, -0.2, 0.1);
  group.add(clock);
  const face = new Mesh(
    new CylinderGeometry(0.55, 0.55, 0.11, 64),
    new MeshStandardMaterial({ color: palette.dark, roughness: 0.38, metalness: 0.12 }),
  );
  face.rotation.x = Math.PI / 2;
  clock.add(face);
  const ring = new Mesh(new TorusGeometry(0.55, 0.033, 12, 64), metal);
  ring.position.z = 0.065;
  clock.add(ring);
  const hours = new Mesh(
    new BoxGeometry(0.038, 0.25, 0.025),
    new MeshStandardMaterial({ color: palette.paper, roughness: 0.4 }),
  );
  hours.position.set(0, 0.1, 0.09);
  hours.rotation.z = -0.48;
  clock.add(hours);
  const minutes = new Mesh(
    new BoxGeometry(0.025, 0.37, 0.025),
    new MeshStandardMaterial({ color: palette.accent, roughness: 0.4 }),
  );
  minutes.position.set(0.115, -0.08, 0.09);
  minutes.rotation.z = -0.94;
  clock.add(minutes);
  const hub = new Mesh(new SphereGeometry(0.038, 12, 12), metal);
  hub.position.z = 0.112;
  clock.add(hub);
  const base = new Mesh(
    new TorusGeometry(1.73, 0.006, 4, 120),
    new MeshBasicMaterial({ color: palette.edge, transparent: true, opacity: 0.6 }),
  );
  base.rotation.x = Math.PI / 2.65;
  base.position.set(0, -1.86, -0.8);
  group.add(base);
  return { group, paper, clock };
}
