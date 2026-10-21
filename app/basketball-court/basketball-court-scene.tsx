"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BACKBOARD_X, BASKET_X, COURT } from "./court";
import {
  createCourtTexture,
  createEnvironmentTexture,
  createLedPanelTexture,
  createLedRibbonTexture,
  createScoreboardTexture,
  createShotClockTexture,
} from "./textures";

const HALF_L = COURT.halfLength;
const HALF_W = COURT.halfWidth;

const TEXTURE_KEYS = [
  "map",
  "alphaMap",
  "emissiveMap",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "bumpMap",
  "envMap",
  "aoMap",
  "lightMap",
  "specularMap",
  "displacementMap",
  "clearcoatMap",
  "clearcoatRoughnessMap",
  "clearcoatNormalMap",
] as const;

function createBeam(
  start: THREE.Vector3,
  end: THREE.Vector3,
  thickness: number,
  material: THREE.Material,
) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, length, thickness),
    material,
  );

  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  beam.castShadow = true;
  return beam;
}

function createNet() {
  const positions: number[] = [];
  const strandCount = 12;
  const height = 0.45;
  const topRadius = COURT.rimRadius;
  const bottomRadius = 0.14;
  const top: THREE.Vector3[] = [];
  const bottom: THREE.Vector3[] = [];

  for (let i = 0; i < strandCount; i += 1) {
    const topAngle = (i / strandCount) * Math.PI * 2;
    top.push(
      new THREE.Vector3(
        Math.cos(topAngle) * topRadius,
        0,
        Math.sin(topAngle) * topRadius,
      ),
    );

    const bottomAngle = ((i + 0.5) / strandCount) * Math.PI * 2;
    bottom.push(
      new THREE.Vector3(
        Math.cos(bottomAngle) * bottomRadius,
        -height,
        Math.sin(bottomAngle) * bottomRadius,
      ),
    );
  }

  for (let i = 0; i < strandCount; i += 1) {
    const upper = top[i];
    const lowerA = bottom[i];
    const lowerB = bottom[(i - 1 + strandCount) % strandCount];
    positions.push(
      upper.x,
      upper.y,
      upper.z,
      lowerA.x,
      lowerA.y,
      lowerA.z,
      upper.x,
      upper.y,
      upper.z,
      lowerB.x,
      lowerB.y,
      lowerB.z,
    );
  }

  for (let ring = 1; ring <= 4; ring += 1) {
    const progress = ring / 5;
    const y = -height * progress;
    const radius = topRadius + (bottomRadius - topRadius) * progress;

    for (let i = 0; i < strandCount; i += 1) {
      const angleA = (i / strandCount) * Math.PI * 2;
      const angleB = ((i + 1) / strandCount) * Math.PI * 2;
      positions.push(
        Math.cos(angleA) * radius,
        y,
        Math.sin(angleA) * radius,
        Math.cos(angleB) * radius,
        y,
        Math.sin(angleB) * radius,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xf4f4f4,
      transparent: true,
      opacity: 0.62,
    }),
  );
}

function createHoop(side: -1 | 1) {
  const group = new THREE.Group();

  const baselineX = side * HALF_L;
  const backboardX = side * BACKBOARD_X;
  const rimX = side * BASKET_X;
  const rimY = COURT.rimHeight;
  const boardCenterY =
    COURT.backboardBottom + COURT.backboardHeight / 2;
  const postX = baselineX + side * 1.05;
  const armY = 3.88;

  const metal = new THREE.MeshStandardMaterial({
    color: 0x171c26,
    metalness: 0.82,
    roughness: 0.3,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x0b0f17,
    metalness: 0.65,
    roughness: 0.45,
  });
  const padding = new THREE.MeshStandardMaterial({
    color: 0x0e2a52,
    metalness: 0.05,
    roughness: 0.72,
  });
  const paddingAccent = new THREE.MeshStandardMaterial({
    color: 0xb83a2b,
    metalness: 0.05,
    roughness: 0.62,
  });
  const white = new THREE.MeshStandardMaterial({
    color: 0xf1eee5,
    metalness: 0.1,
    roughness: 0.32,
    emissive: 0x1a1a1a,
    emissiveIntensity: 0.35,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xcfe4ff,
    metalness: 0.15,
    roughness: 0.06,
    transparent: true,
    opacity: 0.26,
    envMapIntensity: 1.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 篮板玻璃
  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.035,
      COURT.backboardHeight,
      COURT.backboardWidth,
    ),
    glass,
  );
  backboard.position.set(backboardX, boardCenterY, 0);
  group.add(backboard);

  // 篮板白色包边
  const frameThickness = 0.055;
  const frameDepth = 0.022;
  const frameX = backboardX - side * 0.029;

  for (const zSide of [-1, 1] as const) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(
        frameDepth,
        COURT.backboardHeight,
        frameThickness,
      ),
      white,
    );
    bar.position.set(
      frameX,
      boardCenterY,
      zSide * (COURT.backboardWidth / 2 - frameThickness / 2),
    );
    bar.castShadow = true;
    group.add(bar);
  }

  for (const ySide of [-1, 1] as const) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(
        frameDepth,
        frameThickness,
        COURT.backboardWidth,
      ),
      white,
    );
    bar.position.set(
      frameX,
      boardCenterY + ySide * (COURT.backboardHeight / 2 - frameThickness / 2),
      0,
    );
    bar.castShadow = true;
    group.add(bar);
  }

  // 篮板内框
  const targetX = backboardX - side * 0.031;
  const targetBottom = rimY;
  for (const zSide of [-1, 1] as const) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, COURT.targetHeight, 0.028),
      white,
    );
    bar.position.set(
      targetX,
      targetBottom + COURT.targetHeight / 2,
      zSide * (COURT.targetWidth / 2),
    );
    group.add(bar);
  }
  for (const ySide of [-1, 1] as const) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.028, COURT.targetWidth),
      white,
    );
    bar.position.set(
      targetX,
      targetBottom + (ySide === 1 ? COURT.targetHeight : 0),
      0,
    );
    group.add(bar);
  }

  // 篮圈
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(COURT.rimRadius, 0.013, 12, 48),
    new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      metalness: 0.85,
      roughness: 0.24,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.set(rimX, rimY, 0);
  rim.castShadow = true;
  group.add(rim);

  const rimBracket = new THREE.Mesh(
    new THREE.BoxGeometry(Math.abs(rimX - backboardX), 0.035, 0.11),
    metal,
  );
  rimBracket.position.set((rimX + backboardX) / 2, rimY, 0);
  rimBracket.castShadow = true;
  group.add(rimBracket);

  const net = createNet();
  net.position.set(rimX, rimY - 0.006, 0);
  group.add(net);

  // 篮架底座与立柱
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.8, 1.2),
    padding,
  );
  base.position.set(postX, 0.4, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const baseStripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.075, 1.22),
    paddingAccent,
  );
  baseStripe.position.set(postX, 0.58, 0);
  group.add(baseStripe);

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 4.4, 0.22),
    metal,
  );
  post.position.set(postX, 2.2, 0);
  post.castShadow = true;
  group.add(post);

  const postPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 1.35, 0.42),
    padding,
  );
  postPad.position.set(postX, 0.675, 0);
  postPad.castShadow = true;
  group.add(postPad);

  const postPadStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.075, 0.44),
    white,
  );
  postPadStripe.position.set(postX, 0.98, 0);
  group.add(postPadStripe);

  // 悬臂与斜撑
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(Math.abs(postX - backboardX), 0.14, 0.18),
    metal,
  );
  arm.position.set((postX + backboardX) / 2, armY, 0);
  arm.castShadow = true;
  group.add(arm);

  group.add(
    createBeam(
      new THREE.Vector3(postX, 2.85, 0),
      new THREE.Vector3(backboardX + side * 0.1, 3.72, 0),
      0.085,
      metal,
    ),
  );

  for (const zSide of [-1, 1] as const) {
    const mount = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.34, 0.07),
      metal,
    );
    mount.position.set(
      backboardX + side * 0.06,
      armY,
      zSide * 0.34,
    );
    group.add(mount);
  }

  // 篮板顶部 24 秒计时器
  const shotClockTexture = createShotClockTexture();
  const clockX =
    backboardX + side * 0.16;
  const clockY =
    boardCenterY + COURT.backboardHeight / 2 + 0.28;

  const clockHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.42, 0.76),
    darkMetal,
  );
  clockHousing.position.set(clockX, clockY, 0);
  group.add(clockHousing);

  const clockScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.32),
    new THREE.MeshBasicMaterial({
      map: shotClockTexture,
      toneMapped: false,
    }),
  );
  clockScreen.rotation.y = (-side * Math.PI) / 2;
  clockScreen.position.set(clockX - side * 0.075, clockY, 0);
  group.add(clockScreen);

  const clockMount = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.18, 0.18),
    darkMetal,
  );
  clockMount.position.set(
    backboardX + side * 0.09,
    boardCenterY + COURT.backboardHeight / 2 + 0.085,
    0,
  );
  group.add(clockMount);

  return group;
}

function createStands() {
  const group = new THREE.Group();
  const tierCount = 11;
  const firstOffset = 4.2;
  const tierDepth = 0.9;
  const tierRise = 0.42;

  const stepMaterial = new THREE.MeshStandardMaterial({
    color: 0x131b29,
    roughness: 0.94,
    metalness: 0.03,
  });

  const seatSpacing = 0.58;
  const seatMatrices: THREE.Matrix4[] = [];
  const seatColors: THREE.Color[] = [];
  const random = mulberry32(2026);

  const addSeat = (x: number, y: number, z: number, rotationY: number) => {
    seatMatrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, rotationY, 0),
        ),
        new THREE.Vector3(1, 1, 1),
      ),
    );

    const section = Math.floor(seatMatrices.length / 42) % 6;
    const color = new THREE.Color();
    if (section === 1) {
      color.setHSL(0.02, 0.62, 0.2 + random() * 0.06);
    } else if (section === 4) {
      color.setHSL(0.58, 0.48, 0.24 + random() * 0.06);
    } else {
      color.setHSL(0.6 + random() * 0.02, 0.38, 0.14 + random() * 0.07);
    }
    seatColors.push(color);
  };

  for (let tier = 0; tier < tierCount; tier += 1) {
    const offset = firstOffset + tier * tierDepth;
    const innerL = HALF_L + offset;
    const innerW = HALF_W + offset;
    const outerL = innerL + tierDepth;
    const topY = 0.55 + tier * tierRise;
    const stepHeight = tier === 0 ? topY : tierRise;

    for (const zSide of [-1, 1] as const) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(outerL * 2, stepHeight, tierDepth),
        stepMaterial,
      );
      step.position.set(
        0,
        topY - stepHeight / 2,
        zSide * (innerW + tierDepth / 2),
      );
      step.receiveShadow = true;
      group.add(step);
    }

    for (const xSide of [-1, 1] as const) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(tierDepth, stepHeight, innerW * 2),
        stepMaterial,
      );
      step.position.set(
        xSide * (innerL + tierDepth / 2),
        topY - stepHeight / 2,
        0,
      );
      step.receiveShadow = true;
      group.add(step);
    }

    // 长边座椅
    const countX = Math.floor((outerL * 2 - 0.9) / seatSpacing);
    const startX = -((countX - 1) * seatSpacing) / 2;
    for (const zSide of [-1, 1] as const) {
      for (let i = 0; i < countX; i += 1) {
        if (i % 26 === 13) continue;
        addSeat(
          startX + i * seatSpacing,
          topY + 0.22,
          zSide * (innerW + tierDepth - 0.18),
          0,
        );
      }
    }

    // 短边座椅
    const countZ = Math.floor((innerW * 2 - 0.9) / seatSpacing);
    const startZ = -((countZ - 1) * seatSpacing) / 2;
    for (const xSide of [-1, 1] as const) {
      for (let i = 0; i < countZ; i += 1) {
        if (i % 24 === 12) continue;
        addSeat(
          xSide * (innerL + tierDepth - 0.18),
          topY + 0.22,
          startZ + i * seatSpacing,
          Math.PI / 2,
        );
      }
    }
  }

  const seatGeometry = new THREE.BoxGeometry(0.44, 0.44, 0.1);
  const seatMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.04,
  });
  const seats = new THREE.InstancedMesh(
    seatGeometry,
    seatMaterial,
    seatMatrices.length,
  );
  seatMatrices.forEach((matrix, index) => seats.setMatrixAt(index, matrix));
  seatColors.forEach((color, index) => seats.setColorAt(index, color));
  seats.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  seats.instanceMatrix.needsUpdate = true;
  if (seats.instanceColor) seats.instanceColor.needsUpdate = true;
  seats.receiveShadow = true;
  seats.frustumCulled = false;
  group.add(seats);

  // 场馆外墙（从内部可见，退到外面观察时自动隐藏背面）
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(43, 43, 20, 72, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x070b13,
      roughness: 1,
      metalness: 0,
      side: THREE.BackSide,
    }),
  );
  wall.position.y = 10;
  group.add(wall);

  return group;
}

function createLightRig() {
  const group = new THREE.Group();
  const housingMaterial = new THREE.MeshStandardMaterial({
    color: 0x121722,
    metalness: 0.6,
    roughness: 0.5,
  });
  const emitterMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff4e2,
    toneMapped: false,
  });

  for (const x of [-11.5, -4, 4, 11.5]) {
    for (const z of [-5, 5]) {
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(2.9, 0.3, 0.95),
        housingMaterial,
      );
      housing.position.set(x, 17.35, z);
      group.add(housing);

      const emitter = new THREE.Mesh(
        new THREE.BoxGeometry(2.55, 0.06, 0.6),
        emitterMaterial,
      );
      emitter.position.set(x, 17.16, z);
      group.add(emitter);
    }
  }

  const trussMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1119,
    metalness: 0.7,
    roughness: 0.5,
  });
  for (const z of [-5, 5]) {
    const truss = new THREE.Mesh(
      new THREE.BoxGeometry(28, 0.16, 0.16),
      trussMaterial,
    );
    truss.position.set(0, 17.62, z);
    group.add(truss);
  }

  return group;
}

function createScoreboard() {
  const group = new THREE.Group();
  const casingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0e16,
    metalness: 0.55,
    roughness: 0.5,
  });

  const casing = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.4, 4.2),
    casingMaterial,
  );
  group.add(casing);

  const scoreTexture = createScoreboardTexture();
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: scoreTexture,
    toneMapped: false,
  });
  const screenGeometry = new THREE.PlaneGeometry(3.8, 1.9);

  const screens = [
    { x: 0, z: 2.11, rotationY: 0 },
    { x: 0, z: -2.11, rotationY: Math.PI },
    { x: 2.11, z: 0, rotationY: Math.PI / 2 },
    { x: -2.11, z: 0, rotationY: -Math.PI / 2 },
  ];

  for (const { x, z, rotationY } of screens) {
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(x, 0, z);
    screen.rotation.y = rotationY;
    group.add(screen);
  }

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x153b6b,
    metalness: 0.6,
    roughness: 0.35,
    emissive: 0x0a1f3d,
    emissiveIntensity: 0.8,
  });

  const bottomTrim = new THREE.Mesh(
    new THREE.BoxGeometry(4.55, 0.28, 4.55),
    trimMaterial,
  );
  bottomTrim.position.y = -1.32;
  group.add(bottomTrim);

  const topTrim = new THREE.Mesh(
    new THREE.BoxGeometry(4.35, 0.14, 4.35),
    trimMaterial,
  );
  topTrim.position.y = 1.28;
  group.add(topTrim);

  const cableMaterial = new THREE.MeshStandardMaterial({
    color: 0x090c12,
    metalness: 0.6,
    roughness: 0.6,
  });
  for (const x of [-1.7, 1.7]) {
    for (const z of [-1.7, 1.7]) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 12, 6),
        cableMaterial,
      );
      cable.position.set(x, 7.2, z);
      group.add(cable);
    }
  }

  group.position.set(0, 11.3, 0);
  return group;
}

function createCourtsideBoards(ledTexture: THREE.CanvasTexture) {
  const group = new THREE.Group();
  const casingMaterial = new THREE.MeshStandardMaterial({
    color: 0x090d15,
    metalness: 0.45,
    roughness: 0.55,
  });
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: ledTexture,
    toneMapped: false,
  });

  const addBoard = (
    x: number,
    z: number,
    length: number,
    rotationY: number,
    screenX: number,
    screenZ: number,
    screenRotationY: number,
  ) => {
    const casing = new THREE.Mesh(
      new THREE.BoxGeometry(length + 0.4, 1.05, 0.34),
      casingMaterial,
    );
    casing.position.set(x, 0.55, z);
    casing.rotation.y = rotationY;
    group.add(casing);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(length, 0.82),
      screenMaterial,
    );
    screen.position.set(screenX, 0.56, screenZ);
    screen.rotation.y = screenRotationY;
    group.add(screen);
  };

  addBoard(0, 9.9, 20, 0, 0, 9.9 - 0.19, Math.PI);
  addBoard(0, -9.9, 20, 0, 0, -9.9 + 0.19, 0);
  addBoard(16.6, 0, 11, Math.PI / 2, 16.6 - 0.19, 0, -Math.PI / 2);
  addBoard(-16.6, 0, 11, Math.PI / 2, -16.6 + 0.19, 0, Math.PI / 2);

  return group;
}

function createScorersTable() {
  const group = new THREE.Group();
  const casingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b0f17,
    metalness: 0.4,
    roughness: 0.55,
  });

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.82, 0.72),
    casingMaterial,
  );
  table.position.set(0, 0.41, 8.72);
  table.castShadow = true;
  table.receiveShadow = true;
  group.add(table);

  const panelTexture = createLedPanelTexture();
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 0.56),
    new THREE.MeshBasicMaterial({
      map: panelTexture,
      toneMapped: false,
    }),
  );
  panel.position.set(0, 0.52, 8.35);
  panel.rotation.y = Math.PI;
  group.add(panel);

  const chairSeatMaterial = new THREE.MeshStandardMaterial({
    color: 0x14233b,
    roughness: 0.8,
  });
  const chairBackOne = new THREE.MeshStandardMaterial({
    color: 0x0e2a52,
    roughness: 0.78,
  });
  const chairBackTwo = new THREE.MeshStandardMaterial({
    color: 0x8f2b20,
    roughness: 0.78,
  });

  const addChair = (x: number, backMaterial: THREE.Material) => {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.09, 0.48),
      chairSeatMaterial,
    );
    seat.position.set(x, 0.45, 9.55);
    group.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.5, 0.07),
      backMaterial,
    );
    back.position.set(x, 0.72, 9.78);
    group.add(back);
  };

  for (let i = 0; i < 6; i += 1) {
    addChair(-9.2 + i * 0.8, chairBackOne);
    addChair(5.4 + i * 0.8, chairBackTwo);
  }

  return group;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function BasketballCourtScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);

  const handleReset = useCallback(() => {
    resetViewRef.current();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frameId = 0;
    let hasRendered = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060b);
    scene.fog = new THREE.FogExp2(0x04060b, 0.0085);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    host.appendChild(canvas);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 9;
    controls.maxDistance = 58;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI / 2 - 0.035;
    controls.zoomSpeed = 0.75;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;

    const setInitialView = () => {
      const aspect = host.clientWidth / Math.max(1, host.clientHeight);

      if (aspect < 1) {
        // 竖屏时改为沿球场长轴观察，避免场地被左右裁切
        camera.fov = 52;
        camera.position.set(38, 21, 11);
      } else {
        camera.fov = 45;
        const scale = aspect < 1.55 ? 1.12 : 1;
        camera.position.set(20 * scale, 16.5 * scale, 24 * scale);
      }

      camera.updateProjectionMatrix();
      controls.target.set(0, 0.5, 0);
      controls.update();
      controls.saveState();
    };
    setInitialView();

    // 环境与灯光
    const environmentTexture = createEnvironmentTexture();
    scene.environment = environmentTexture;

    scene.add(new THREE.HemisphereLight(0x9dbdff, 0x1a120a, 0.52));
    scene.add(new THREE.AmbientLight(0x25314a, 0.28));

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.1);
    keyLight.position.set(16, 24, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -24;
    keyLight.shadow.camera.right = 24;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 70;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.normalBias = 0.025;
    scene.add(keyLight);
    scene.add(keyLight.target);

    const fillLight = new THREE.DirectionalLight(0x6f9cff, 0.55);
    fillLight.position.set(-15, 17, -11);
    scene.add(fillLight);

    const spotLeft = new THREE.SpotLight(
      0xfff2dd,
      520,
      62,
      0.62,
      0.82,
      1.7,
    );
    spotLeft.position.set(-9, 21, 0);
    spotLeft.target.position.set(-8, 0, 0);
    scene.add(spotLeft);
    scene.add(spotLeft.target);

    const spotRight = new THREE.SpotLight(
      0xfff2dd,
      520,
      62,
      0.62,
      0.82,
      1.7,
    );
    spotRight.position.set(9, 21, 0);
    spotRight.target.position.set(8, 0, 0);
    scene.add(spotRight);
    scene.add(spotRight.target);

    const overhead = new THREE.SpotLight(
      0xdfeaff,
      430,
      70,
      0.72,
      0.9,
      1.6,
    );
    overhead.position.set(0, 23, 0);
    overhead.target.position.set(0, 0, 0);
    scene.add(overhead);
    scene.add(overhead.target);

    // 地板
    const outerFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshStandardMaterial({
        color: 0x04070d,
        roughness: 0.96,
        metalness: 0.02,
      }),
    );
    outerFloor.rotation.x = -Math.PI / 2;
    outerFloor.position.y = -0.04;
    outerFloor.receiveShadow = true;
    scene.add(outerFloor);

    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.length + 7, COURT.width + 7),
      new THREE.MeshPhysicalMaterial({
        color: 0x38220f,
        roughness: 0.55,
        metalness: 0.02,
        clearcoat: 0.28,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.45,
      }),
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.015;
    apron.receiveShadow = true;
    scene.add(apron);

    const compactScreen =
      Math.min(window.innerWidth, window.innerHeight) < 820;
    const courtTexture = createCourtTexture(
      renderer.capabilities.getMaxAnisotropy(),
      compactScreen ? 2048 : 4096,
    );
    const courtMaterial = new THREE.MeshPhysicalMaterial({
      map: courtTexture,
      roughness: 0.42,
      metalness: 0.02,
      clearcoat: 0.45,
      clearcoatRoughness: 0.34,
      envMapIntensity: 0.55,
    });
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.length, COURT.width),
      courtMaterial,
    );
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);

    // 异步加载公牛队 logo 图片；加载完成后重新生成中圈贴图并替换
    const logoImage = new Image();
    logoImage.decoding = "async";
    logoImage.onload = () => {
      if (disposed) return;

      const logoTexture = createCourtTexture(
        renderer.capabilities.getMaxAnisotropy(),
        compactScreen ? 2048 : 4096,
        logoImage,
      );
      const previousTexture = courtMaterial.map;
      courtMaterial.map = logoTexture;
      courtMaterial.needsUpdate = true;
      previousTexture?.dispose();
    };
    logoImage.src = "/bulls-logo.png";

    // 篮架
    scene.add(createHoop(-1));
    scene.add(createHoop(1));

    // 场边与场馆结构
    scene.add(createStands());
    scene.add(createLightRig());
    scene.add(createScoreboard());
    scene.add(createScorersTable());

    const ledTexture = createLedRibbonTexture();
    scene.add(createCourtsideBoards(ledTexture));

    // 视角交互
    const clearIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
      }
    };

    const onControlStart = () => {
      controls.autoRotate = false;
      clearIdleTimer();
    };

    const onControlEnd = () => {
      clearIdleTimer();
      idleTimer = setTimeout(() => {
        controls.autoRotate = true;
      }, 4200);
    };

    controls.addEventListener("start", onControlStart);
    controls.addEventListener("end", onControlEnd);

    const resetView = () => {
      clearIdleTimer();
      controls.reset();
      controls.autoRotate = true;
    };

    resetViewRef.current = resetView;
    canvas.addEventListener("dblclick", resetView);

    // 尺寸自适应
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed) return;
      frameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1);
      ledTexture.offset.x = (ledTexture.offset.x + delta * 0.032) % 1;

      controls.update();
      renderer.render(scene, camera);

      if (!hasRendered) {
        hasRendered = true;
        setReady(true);
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearIdleTimer();
      resizeObserver.disconnect();
      canvas.removeEventListener("dblclick", resetView);
      controls.removeEventListener("start", onControlStart);
      controls.removeEventListener("end", onControlEnd);
      controls.dispose();

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();

      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);

        const objectMaterials = Array.isArray(mesh.material)
          ? mesh.material
          : mesh.material
            ? [mesh.material]
            : [];

        for (const material of objectMaterials) {
          materials.add(material);
          const record = material as unknown as Record<string, unknown>;
          for (const key of TEXTURE_KEYS) {
            const value = record[key];
            if (value instanceof THREE.Texture) textures.add(value);
          }
        }
      });

      textures.add(ledTexture);
      textures.add(environmentTexture);

      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());

      renderer.dispose();
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
  }, []);

  return (
    <main className="relative h-dvh w-full select-none overflow-hidden bg-[#04060b] text-white">
      <div
        ref={hostRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label="芝加哥公牛主题 NBA 标准篮球场 3D 场景"
        role="img"
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_34%,rgba(0,0,0,0.68)_100%)]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-6 sm:p-10">
        <div>
          <p className="text-[9px] tracking-[0.42em] text-orange-300/65 uppercase sm:text-[10px]">
            Chicago Bulls · NBA Court
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:mt-3 sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-b from-white via-orange-100 to-orange-500/75 bg-clip-text text-transparent">
              NBA 标准篮球场
            </span>
          </h1>
          <p className="mt-2 text-[10px] tracking-[0.42em] text-white/35 uppercase sm:text-xs">
            94 ft × 50 ft · Bulls Court Tribute
          </p>
        </div>

        <div className="hidden flex-col items-end gap-2 sm:flex">
          <span className="h-px w-20 bg-gradient-to-r from-transparent to-orange-400/50" />
          <p className="text-[10px] tracking-[0.28em] text-white/30 uppercase">
            3PT 23&apos;9&quot; · RIM 10 FT
          </p>
          <p className="text-[10px] tracking-[0.28em] text-white/20 uppercase">
            Key 16 FT · Line 2 IN
          </p>
        </div>
      </header>

      <button
        type="button"
        onClick={handleReset}
        className="absolute right-5 bottom-20 z-10 rounded-full border border-white/15 bg-black/35 px-5 py-2.5 text-[11px] tracking-[0.22em] text-white/70 backdrop-blur-md transition-colors hover:border-orange-300/50 hover:text-orange-200 sm:right-10 sm:bottom-24"
      >
        重置视角
      </button>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-5 sm:p-8">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-center text-[10px] text-white/50 backdrop-blur-md sm:gap-x-3 sm:rounded-full sm:px-5 sm:text-[11px]">
          <span>拖拽旋转</span>
          <span className="h-3 w-px bg-white/15" />
          <span>滚轮 / 双指缩放</span>
          <span className="h-3 w-px bg-white/15" />
          <span>待机自动旋转</span>
          <span className="h-3 w-px bg-white/15" />
          <span>双击重置</span>
        </div>
      </footer>

      <div
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#04060b] transition-opacity duration-700 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-orange-400" />
          <p className="text-[10px] tracking-[0.35em] text-white/45 uppercase">
            Building Court
          </p>
        </div>
      </div>
    </main>
  );
}
