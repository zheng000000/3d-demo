"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** 由 yasuo.skp 转换而来的 glTF 模型 */
const MODEL_URL = "/models/yasuo.glb";
/** 自动旋转速度（OrbitControls 单位，数值越大越快） */
const AUTO_ROTATE_SPEED = 1.6;
/** 用户停止操作后恢复自动旋转的延迟（毫秒） */
const AUTO_ROTATE_RESUME_DELAY = 1500;

export default function YasuoScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    // 场景与相机
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);
    scene.fog = new THREE.Fog(0x0b1020, 10, 30);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position.set(1.4, 1.4, 3.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);

    // 环境反射，让暗色模型的体积和材质细节更清晰
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.3;

    // 灯光
    scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x2a3550, 1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -1;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6ea8fe, 0.9);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-4, 2.5, 4);
    scene.add(fillLight);

    // 背面补光，旋转到背面时模型依然清晰
    const backLight = new THREE.DirectionalLight(0xffd9c4, 0.7);
    backLight.position.set(0, 3.5, -6);
    scene.add(backLight);

    // 地面与网格
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.95,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(18, 36, 0x1f2937, 0x1f2937);
    grid.position.y = 0.002;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.35;
    scene.add(grid);

    // 交互控制：拖拽旋转、滚轮缩放、空闲自动旋转
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.target.set(0, 1, 0);

    let resumeTimer: number | undefined;
    const pauseAutoRotate = () => {
      controls.autoRotate = false;
      window.clearTimeout(resumeTimer);
    };
    const scheduleAutoRotate = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        controls.autoRotate = true;
      }, AUTO_ROTATE_RESUME_DELAY);
    };
    controls.addEventListener("start", pauseAutoRotate);
    controls.addEventListener("end", scheduleAutoRotate);

    // 加载模型
    let model: THREE.Group | null = null;
    const loader = new GLTFLoader();
    const abortController = new AbortController();

    const onModelLoaded = (gltfScene: THREE.Group) => {
      if (disposed) {
        disposeObject(gltfScene);
        return;
      }

      // 让模型的水平中心落在原点、脚底贴地
      const box = new THREE.Box3().setFromObject(gltfScene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      gltfScene.position.x -= center.x;
      gltfScene.position.z -= center.z;
      gltfScene.position.y -= box.min.y;

      gltfScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // 用一个位于原点的枢轴承载模型，保证自转时绕自身中心旋转
      const pivot = new THREE.Group();
      pivot.add(gltfScene);
      scene.add(pivot);
      model = pivot;

      // 根据模型尺寸自动取景
      const targetY = size.y * 0.5;
      const distance =
        (Math.max(size.x, size.y, size.z) * 0.5) /
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
        1.25;

      controls.target.set(0, targetY, 0);
      const dir = new THREE.Vector3(0.4, 0.16, 1).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, distance);
      controls.minDistance = distance * 0.45;
      controls.maxDistance = distance * 1.9;
      controls.update();

      setProgress(1);
      setReady(true);
    };

    // 用 fetch 流式读取，这样即使服务端分块传输也能拿到加载进度
    const loadModel = async () => {
      try {
        const response = await fetch(MODEL_URL, {
          signal: abortController.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const total = Number(response.headers.get("content-length")) || 0;
        let buffer: ArrayBuffer;

        if (response.body) {
          const reader = response.body.getReader();
          const chunks: Uint8Array<ArrayBuffer>[] = [];
          let loaded = 0;
          let lastPercent = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new Uint8Array(value.byteLength);
            chunk.set(value);
            chunks.push(chunk);
            loaded += value.byteLength;

            if (total > 0) {
              const percent = Math.min(loaded / total, 1);
              if (percent - lastPercent >= 0.005 || percent >= 1) {
                lastPercent = percent;
                setProgress(percent);
              }
            }
          }

          buffer = await new Blob(chunks).arrayBuffer();
        } else {
          buffer = await response.arrayBuffer();
        }

        if (disposed) return;
        loader.parse(buffer, "", (gltf) => onModelLoaded(gltf.scene), (err) => {
          if (!disposed) {
            setError(err instanceof Error ? err.message : String(err));
          }
        });
      } catch (err) {
        if (disposed) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    void loadModel();

    // 自适应容器尺寸
    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // 渲染循环
    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      abortController.abort();
      cancelAnimationFrame(frameId);
      window.clearTimeout(resumeTimer);
      resizeObserver.disconnect();

      controls.removeEventListener("start", pauseAutoRotate);
      controls.removeEventListener("end", scheduleAutoRotate);
      controls.dispose();
      if (model) disposeObject(model);
      environment.dispose();
      pmremGenerator.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      grid.geometry.dispose();
      gridMaterial.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0b1020]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* 加载进度 */}
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0b1020]/80 px-8 text-slate-200 backdrop-blur-sm">
          <p className="text-sm tracking-widest text-slate-300 uppercase">
            Loading Model
          </p>
          <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-sky-400 transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="font-mono text-xs text-slate-400">
            {Math.round(progress * 100)}%
          </p>
        </div>
      )}

      {/* 加载失败 */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0b1020]/90 px-8 text-center">
          <p className="text-base font-medium text-red-300">模型加载失败</p>
          <p className="max-w-md text-sm text-slate-400">{error}</p>
        </div>
      )}

      {/* 标题与操作提示 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-6">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-slate-100">
            3D 亚索
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            自动旋转 · 拖拽查看 · 滚轮缩放
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-wider text-slate-400">
          THREE.JS
        </span>
      </div>
    </main>
  );
}

/** 释放模型占用的 GPU 资源 */
function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}
