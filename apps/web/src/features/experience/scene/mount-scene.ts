import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from "three";
import { paperTexture, type ScenePalette } from "./paper-texture";
import { sceneObjects } from "./scene-objects";

export interface SceneController {
  setPaused(paused: boolean): void;
  dispose(): void;
}

export function mountScene(
  stage: HTMLElement,
  holder: HTMLElement,
  onStatus: (status: "webgl" | "fallback") => void,
): SceneController | null {
  const canvas = document.createElement("canvas");
  const options: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  };
  const context = canvas.getContext("webgl2", options);
  if (!context) {
    onStatus("fallback");
    return null;
  }
  const renderer = new WebGLRenderer({ canvas, context, ...options });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  canvas.setAttribute("aria-hidden", "true");
  holder.append(canvas);
  const css = getComputedStyle(stage),
    token = (name: string) => css.getPropertyValue(`--color-public-${name}`).trim();
  const palette: ScenePalette = {
    paper: token("paper"),
    ink: token("paper-ink"),
    muted: token("paper-muted"),
    line: token("paper-line"),
    selected: token("paper-selected"),
    edge: token("paper-edge"),
    dark: token("surface"),
    accent: token("accent"),
  };
  const texture = paperTexture(palette);
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  const scene = new Scene(),
    camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 10.1);
  scene.add(new AmbientLight(palette.accent, 1.9));
  const key = new DirectionalLight(palette.paper, 3.5);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const rim = new DirectionalLight(palette.accent, 5);
  rim.position.set(4, 0, -2);
  scene.add(rim);
  const fill = new DirectionalLight(palette.paper, 1.5);
  fill.position.set(-5, -3, 2);
  scene.add(fill);
  const { group, paper, clock } = sceneObjects(texture, palette);
  scene.add(group);
  let paused = true,
    visible = false,
    lost = false,
    disposed = false,
    lastTime = 0,
    phase = 0;
  const pointer = { x: 0, y: 0 };
  const moving = () => !paused && visible && !document.hidden && !lost && !disposed;
  function draw(time: number) {
    if (disposed || lost) return;
    if (moving()) {
      if (lastTime) phase += Math.min(time - lastTime, 40) / 1000;
      lastTime = time;
    }
    paper.rotation.set(0.14 + pointer.y * 0.04, -0.3 + pointer.x * 0.08, -0.14);
    group.position.y = Math.sin(phase * 0.85) * 0.12;
    group.rotation.y = Math.sin(phase * 0.3) * 0.028;
    clock.position.y = 1.72 + Math.sin(phase * 0.85 + 1.5) * 0.055;
    renderer.render(scene, camera);
  }
  function sync() {
    if (disposed) return;
    lastTime = 0;
    renderer.setAnimationLoop(moving() ? draw : null);
    if (visible && !document.hidden && !lost) draw(performance.now());
  }
  function resize() {
    const width = stage.clientWidth,
      height = stage.clientHeight;
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 340 ? 10.8 : 10.1;
    camera.updateProjectionMatrix();
    sync();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      sync();
    },
    { threshold: 0.05 },
  );
  observer.observe(stage);
  const move = (event: PointerEvent) => {
    if (paused || event.pointerType !== "mouse") return;
    const rect = stage.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
    pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
  };
  const leave = () => {
    pointer.x = 0;
    pointer.y = 0;
  };
  const lose = (event: Event) => {
    event.preventDefault();
    lost = true;
    renderer.setAnimationLoop(null);
    onStatus("fallback");
  };
  const restore = () => {
    lost = false;
    onStatus("webgl");
    resize();
    sync();
  };
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerleave", leave);
  document.addEventListener("visibilitychange", sync);
  canvas.addEventListener("webglcontextlost", lose);
  canvas.addEventListener("webglcontextrestored", restore);
  resize();
  onStatus("webgl");
  return {
    setPaused(value) {
      paused = value;
      if (paused) leave();
      sync();
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      observer.disconnect();
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", lose);
      canvas.removeEventListener("webglcontextrestored", restore);
      const geometries = new Set<BufferGeometry>(),
        materials = new Set<Material>();
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(
            (material) => materials.add(material),
          );
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
