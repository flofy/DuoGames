// Scène 3D (three.js) : coffre, porte, butin et hélices de chaîne autour des 3 axes.
import {
  WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, Group, Mesh,
  BoxGeometry, PlaneGeometry, CylinderGeometry, TorusGeometry, CircleGeometry, SphereGeometry,
  MeshStandardMaterial, MeshBasicMaterial, InstancedMesh, Object3D, Vector3, Quaternion, DoubleSide
} from 'three';
import { DEG, GAIN, remainingLen } from './logic.js';

export const AXIS_COLOR = { x: 0xef476f, y: 0x19c3a3, z: 0x3f8fe0 };
export const AXIS_CSS = { x: '#ef476f', y: '#19c3a3', z: '#3f8fe0' };
export const PER_TURN = 26; // maillons par tour d'hélice
const R_HELIX = 1.08;
const PITCH = 0.16;
const CAMERA_Z = 5.6;
const FOV = 38;
const FIT_RADIUS = 1.45;
const DOOR_OPEN = 1.55; // rad

const std = (color, extra) => new MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.5, ...extra });
const visibleLinks = (h, len) => Math.min(h.total, Math.max(0, Math.ceil((len / 360) * PER_TURN)));

// host : élément DOM qui recevra le <canvas>. Lève une exception si WebGL est indisponible.
export function createScene(host) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
  camera.position.set(0, 0, CAMERA_Z);
  scene.add(new AmbientLight(0xffffff, 1.9));
  const sun = new DirectionalLight(0xffffff, 2.6);
  sun.position.set(3, 4, 5);
  scene.add(sun);

  const pivot = new Group();
  scene.add(pivot);
  let helices = [];
  const owned = []; // géométries et matériaux à libérer

  const track = (x) => { owned.push(x); return x; };
  function mesh(geo, mat) { track(geo); track(mat); return new Mesh(geo, mat); }

  // ----- coffre -----
  pivot.add(mesh(new BoxGeometry(1.4, 1.4, 1.4), std(0x7b8ab8)));
  const inner = mesh(new PlaneGeometry(1.2, 1.2), new MeshBasicMaterial({ color: 0x151a2e }));
  inner.position.z = 0.703;
  pivot.add(inner);

  const loot = new Group();
  for (let i = 0; i < 5; i++) {
    const coin = mesh(new CylinderGeometry(0.17, 0.17, 0.05, 20), std(0xffc83d, { emissive: 0x6b4a00, metalness: 0.7, roughness: 0.3 }));
    coin.rotation.x = Math.PI / 2;
    coin.position.set(-0.4 + i * 0.2, -0.38 + (i % 2) * 0.1, 0.74);
    loot.add(coin);
  }
  loot.visible = false;
  pivot.add(loot);

  const door = new Group(); // articulée sur son bord gauche
  door.position.set(-0.62, 0, 0.74);
  pivot.add(door);
  const plate = mesh(new BoxGeometry(1.24, 1.24, 0.08), std(0xa9b6e0));
  plate.position.x = 0.62;
  door.add(plate);
  const rim = mesh(new TorusGeometry(0.28, 0.035, 10, 32), std(AXIS_COLOR.z));
  rim.position.set(0.62, 0.05, 0.06);
  door.add(rim);
  const hub = mesh(new CylinderGeometry(0.1, 0.1, 0.08, 20), std(0xffd84d));
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0.62, 0.05, 0.07);
  door.add(hub);
  const handle = mesh(new BoxGeometry(0.46, 0.07, 0.07), std(0x2b2f4a));
  handle.position.set(0.62, 0.05, 0.1);
  door.add(handle);
  for (const [x, y] of [[0.1, 0.52], [1.14, 0.52], [0.1, -0.52], [1.14, -0.52]]) {
    const r = mesh(new SphereGeometry(0.045, 10, 10), std(0x2b2f4a));
    r.position.set(x, y, 0.05);
    door.add(r);
  }
  // pastilles de couleur sur les faces : repèrent les axes (rouge X, vert Y, bleu Z)
  const disc = (axis, nx, ny, nz) => {
    const m = mesh(new CircleGeometry(0.17, 24), new MeshBasicMaterial({ color: AXIS_COLOR[axis], side: DoubleSide }));
    m.position.set(nx * 0.705, ny * 0.705, nz * 0.705);
    if (nx) m.rotation.y = Math.PI / 2;
    if (ny) m.rotation.x = Math.PI / 2;
    pivot.add(m);
  };
  disc('x', 1, 0, 0); disc('x', -1, 0, 0); disc('y', 0, 1, 0); disc('y', 0, -1, 0); disc('z', 0, 0, -1);

  // ----- hélices de chaîne : le bout libre est le dernier maillon -----
  function buildHelix(seg) {
    const turns = seg.len / 360;
    const total = Math.max(2, Math.round(turns * PER_TURN));
    const geo = new TorusGeometry(0.072, 0.026, 8, 14);
    geo.scale(1.5, 1, 1);
    const material = std(AXIS_COLOR[seg.axis], { metalness: 0.55, roughness: 0.35 });
    const instanced = new InstancedMesh(geo, material, total);
    const A = new Vector3(), U = new Vector3(), V = new Vector3();
    if (seg.axis === 'x') { A.set(1, 0, 0); U.set(0, 1, 0); V.set(0, 0, 1); }
    else if (seg.axis === 'y') { A.set(0, 1, 0); U.set(0, 0, 1); V.set(1, 0, 0); }
    else { A.set(0, 0, 1); U.set(1, 0, 0); V.set(0, 1, 0); }
    const d = new Object3D(), T = new Vector3(), q1 = new Quaternion(), q2 = new Quaternion(), X = new Vector3(1, 0, 0);
    for (let j = 0; j < total; j++) {
      const t = j / PER_TURN, th = t * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      d.position.copy(A).multiplyScalar((t - turns / 2) * PITCH).addScaledVector(U, R_HELIX * c).addScaledVector(V, R_HELIX * s);
      T.copy(U).multiplyScalar(-s).addScaledVector(V, c).addScaledVector(A, PITCH / (2 * Math.PI * R_HELIX)).normalize();
      q1.setFromUnitVectors(X, T);
      q2.setFromAxisAngle(T, j % 2 ? Math.PI / 2 : 0);
      d.quaternion.copy(q2).multiply(q1);
      d.updateMatrix();
      instanced.setMatrixAt(j, d.matrix);
    }
    instanced.count = total;
    const group = new Group();
    group.add(instanced);
    pivot.add(group);
    return { group, instanced, material, geo, total, seg, state: '' };
  }
  function disposeHelices() {
    helices.forEach((h) => { pivot.remove(h.group); h.instanced.dispose?.(); h.geo.dispose(); h.material.dispose(); });
    helices = [];
  }
  function setChain(segs) {
    disposeHelices();
    helices = segs.map(buildHelix);
  }

  // état visuel d'une hélice : active (opaque, lumineuse), à venir (translucide), terminée (cachée)
  function styleHelix(h, state) {
    if (h.state === state) return;
    h.state = state;
    const active = state === 'active';
    h.group.visible = state !== 'done';
    h.material.transparent = !active;
    h.material.opacity = active ? 1 : 0.5;
    h.material.emissive.setHex(active ? AXIS_COLOR[h.seg.axis] : 0x000000);
    h.material.emissiveIntensity = active ? 0.4 : 0;
    h.material.needsUpdate = true;
  }

  // O : quaternion [w,x,y,z] du coffre ; door : 0 fermée → 1 ouverte ; run : progression ; playing : tour en cours
  function update({ O, door: doorT, run, playing }) {
    pivot.quaternion.set(O[1], O[2], O[3], O[0]);
    door.rotation.y = -doorT * DOOR_OPEN; // ~90° : la porte reste dans le cadre
    loot.visible = doorT > 0.05;
    helices.forEach((h, i) => {
      const done = run.done || i < run.idx;
      const active = !done && playing && i === run.idx;
      styleHelix(h, done ? 'done' : active ? 'active' : 'idle');
      h.group.rotation.set(0, 0, 0);
      if (active) h.group.rotation[h.seg.axis] = h.seg.dir * (run.prog / GAIN) * DEG; // l'hélice tourne avec le geste
      h.instanced.count = done ? 0 : i === run.idx ? visibleLinks(h, remainingLen(run)) : h.total;
    });
  }

  function resize(w, h) {
    if (!(w > 0 && h > 0)) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // recule seulement si le conteneur est trop étroit pour contenir coffre + chaîne (rayon ~1,45)
    camera.position.z = Math.max(CAMERA_Z, FIT_RADIUS / (Math.tan((FOV / 2) * DEG) * camera.aspect));
    camera.updateProjectionMatrix();
  }

  const render = () => renderer.render(scene, camera);

  function dispose() {
    disposeHelices();
    owned.forEach((o) => o.dispose?.());
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { resize, setChain, update, render, dispose, get helices() { return helices; }, get canvas() { return renderer.domElement; }, get camera() { return camera; } };
}
