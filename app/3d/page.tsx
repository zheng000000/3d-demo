"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** 拖动 1 像素对应的旋转弧度 */
const ROTATION_PER_PIXEL = 0.008;
/** 松手后每帧的速度衰减系数（按 60fps 归一化） */
const INERTIA_DAMPING = 0.93;
/** 惯性最大角速度，避免快速甩动时转得失控 */
const MAX_ANGULAR_VELOCITY = 12;
/** 垂直方向限制在 ±90° 内，避免正方体翻转后方向感错乱 */
const MAX_PITCH = Math.PI / 2 - 0.01;

export default function ThreeDPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 场景与相机
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);

    // 灯光
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    rimLight.position.set(-6, -3, -4);
    scene.add(rimLight);

    // 正面补光，避免背光面色偏黑、难以分辨
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.6);
    fillLight.position.set(-5, 2, 5);
    scene.add(fillLight);

    // 正方体：BoxGeometry 的面顺序为 +X、-X、+Y、-Y、+Z、-Z，每个面单独一种颜色
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const faceColors = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x3b82f6, 0xa855f7];
    const materials = faceColors.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.12,
          roughness: 0.35,
        }),
    );
    const cube = new THREE.Mesh(geometry, materials);
    cube.rotation.order = "YXZ";
    scene.add(cube);

    // 棱边描线，让立方体轮廓更清晰
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xe0e7ff,
      transparent: true,
      opacity: 0.7,
    });
    cube.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

    // 旋转状态：yaw 绕世界 Y 轴，pitch 绕自身 X 轴
    let yaw = 0.6;
    let pitch = -0.35;
    let velocityYaw = 0;
    let velocityPitch = 0;

    let dragging = false;
    let pointerId = -1;
    let lastX = 0;
    let lastY = 0;
    let lastMoveTime = 0;

    const clampPitch = () => {
      if (pitch > MAX_PITCH) {
        pitch = MAX_PITCH;
        velocityPitch = 0;
      } else if (pitch < -MAX_PITCH) {
        pitch = -MAX_PITCH;
        velocityPitch = 0;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      lastMoveTime = performance.now();
      velocityYaw = 0;
      velocityPitch = 0;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const now = performance.now();
      const dt = Math.max((now - lastMoveTime) / 1000, 1 / 240);
      const deltaYaw = (event.clientX - lastX) * ROTATION_PER_PIXEL;
      const deltaPitch = (event.clientY - lastY) * ROTATION_PER_PIXEL;

      yaw += deltaYaw;
      pitch += deltaPitch;
      clampPitch();

      velocityYaw = THREE.MathUtils.clamp(
        deltaYaw / dt,
        -MAX_ANGULAR_VELOCITY,
        MAX_ANGULAR_VELOCITY,
      );
      velocityPitch = THREE.MathUtils.clamp(
        deltaPitch / dt,
        -MAX_ANGULAR_VELOCITY,
        MAX_ANGULAR_VELOCITY,
      );

      lastX = event.clientX;
      lastY = event.clientY;
      lastMoveTime = now;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = -1;
      // 停住一段时间后才松手时不再产生惯性
      if (performance.now() - lastMoveTime > 100) {
        velocityYaw = 0;
        velocityPitch = 0;
      }
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

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
    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.05);

      if (!dragging) {
        yaw += velocityYaw * dt;
        pitch += velocityPitch * dt;
        clampPitch();

        const damping = Math.pow(INERTIA_DAMPING, dt * 60);
        velocityYaw *= damping;
        velocityPitch *= damping;
        if (Math.abs(velocityYaw) < 0.001) velocityYaw = 0;
        if (Math.abs(velocityPitch) < 0.001) velocityPitch = 0;
      }

      cube.rotation.x = pitch;
      cube.rotation.y = yaw;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();

      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);

      edgeGeometry.dispose();
      edgeMaterial.dispose();
      geometry.dispose();
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <main
      ref={containerRef}
      className="relative h-dvh w-full cursor-grab touch-none overflow-hidden bg-gradient-to-b from-slate-100 to-slate-300 select-none active:cursor-grabbing dark:from-neutral-900 dark:to-black"
    />
  );
}
