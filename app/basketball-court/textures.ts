import * as THREE from "three";
import {
  BASKET_X,
  COURT,
  THREE_POINT_CORNER_ANGLE,
  THREE_POINT_CORNER_X,
  BACKBOARD_X,
} from "./court";

const LINE_COLOR = "#f3efe4";
const PAINT_COLOR = "#0f2749";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  spacing: number,
  font: string,
  color: string,
  rotation = 0,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total =
    widths.reduce((sum, width) => sum + width, 0) +
    spacing * Math.max(0, chars.length - 1);

  let x = -total / 2;
  chars.forEach((char, index) => {
    ctx.fillText(char, x, 0);
    x += widths[index] + spacing;
  });
  ctx.restore();
}

function drawWood(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
) {
  const random = mulberry32(20261019);

  ctx.fillStyle = "#bd8247";
  ctx.fillRect(0, 0, width, height);

  // 沿球场长度方向铺设的木地板
  const plankHeight = Math.max(8, 0.0762 * scale);

  for (let y = 0; y < height; y += plankHeight) {
    let x = -random() * scale * 3;

    while (x < width) {
      const length = (1.4 + random() * 3.6) * scale;
      const hue = 27 + random() * 6;
      const saturation = 46 + random() * 9;
      const lightness = 45 + random() * 10;

      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.fillRect(x, y, length, plankHeight);

      // 木纹
      const grains = 1 + Math.floor(random() * 3);
      for (let g = 0; g < grains; g += 1) {
        const grainY = y + random() * plankHeight;
        ctx.strokeStyle = `rgba(92, 46, 16, ${0.035 + random() * 0.07})`;
        ctx.lineWidth = Math.max(1, scale * 0.002);
        ctx.beginPath();
        ctx.moveTo(x, grainY);
        ctx.lineTo(x + length, grainY + (random() - 0.5) * 2);
        ctx.stroke();
      }

      // 板材接缝
      ctx.fillStyle = "rgba(78, 40, 14, 0.22)";
      ctx.fillRect(x + length - 1, y, 2, plankHeight);

      x += length;
    }

    ctx.fillStyle = "rgba(82, 42, 16, 0.18)";
    ctx.fillRect(0, y, width, 1);
  }

  // 大面积的柔和反光
  for (let i = 0; i < 16; i += 1) {
    const streakY = random() * height;
    const gradient = ctx.createLinearGradient(0, streakY, width, streakY);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(
      0.28 + random() * 0.42,
      `rgba(255, 234, 198, ${0.012 + random() * 0.028})`,
    );
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, streakY, width, scale * (0.02 + random() * 0.055));
  }
}

/**
 * 中圈公牛队队徽：把官方 logo 图片作为贴图铺在奶油白圆形底板上。
 * 图片异步加载，未就绪时先绘制文字占位。
 */
function drawCenterEmblem(
  ctx: CanvasRenderingContext2D,
  X: (x: number) => number,
  Y: (z: number) => number,
  px: (meters: number) => number,
  logoImage?: HTMLImageElement | null,
) {
  const cx = X(0);
  const cy = Y(0);

  // 内圈红色装饰环
  ctx.strokeStyle = "#ce1141";
  ctx.lineWidth = px(0.055);
  ctx.beginPath();
  ctx.arc(cx, cy, px(1.74), 0, Math.PI * 2);
  ctx.stroke();

  if (logoImage && logoImage.naturalWidth > 0) {
    // 控制在 2.35m 见方内，保证四角都落在红色圆环里
    const logoWidth = px(2.35);
    const logoHeight =
      logoWidth * (logoImage.naturalHeight / logoImage.naturalWidth);

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = px(0.05);
    ctx.shadowOffsetY = px(0.02);
    ctx.drawImage(
      logoImage,
      cx - logoWidth / 2,
      cy - logoHeight / 2,
      logoWidth,
      logoHeight,
    );
    ctx.restore();
    return;
  }

  // 图片加载完成前的占位字标
  drawSpacedText(
    ctx,
    "CHICAGO",
    cx,
    cy - px(0.22),
    px(0.05),
    `800 ${px(0.18)}px Georgia, "Times New Roman", serif`,
    "#0b0507",
  );
  drawSpacedText(
    ctx,
    "BULLS",
    cx,
    cy + px(0.2),
    px(0.06),
    `900 ${px(0.36)}px Georgia, "Times New Roman", serif`,
    "#ce1141",
  );
}

/**
 * 用 Canvas 绘制整块球场（木地板 + 全部标线 + 中圈图案），
 * 再作为纹理贴到 28.65m × 15.24m 的地板上，避免多几何体叠加产生锯齿。
 */
export function createCourtTexture(
  maxAnisotropy = 1,
  textureWidth = 4096,
  logoImage?: HTMLImageElement | null,
): THREE.CanvasTexture {
  const width = textureWidth;
  const height = Math.round((width * COURT.width) / COURT.length);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建球场纹理画布");

  const scale = width / COURT.length;
  const px = (meters: number) => meters * scale;
  const X = (x: number) => (x + COURT.halfLength) * scale;
  const Y = (z: number) => (z + COURT.halfWidth) * scale;
  const lineWidth = px(COURT.lineWidth);

  drawWood(ctx, width, height, scale);

  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.lineWidth = lineWidth;

  // 禁区 / 三秒区涂装
  for (const side of [-1, 1] as const) {
    const baselineX = side * COURT.halfLength;
    const freeThrowX = side * (COURT.halfLength - COURT.laneDepth);
    const left = Math.min(X(baselineX), X(freeThrowX));
    const top = Y(-COURT.laneWidth / 2);

    const paintGradient = ctx.createLinearGradient(
      0,
      top,
      0,
      top + px(COURT.laneWidth),
    );
    paintGradient.addColorStop(0, "#12305a");
    paintGradient.addColorStop(0.5, PAINT_COLOR);
    paintGradient.addColorStop(1, "#0b203d");
    ctx.fillStyle = paintGradient;
    ctx.fillRect(left, top, px(COURT.laneDepth), px(COURT.laneWidth));

    // 涂装透出极淡的木纹
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = "#89a9d6";
    for (let i = 0; i < 22; i += 1) {
      const y = top + (i / 22) * px(COURT.laneWidth);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + px(COURT.laneDepth), y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 中线（稍后会被中圈涂装盖住中央部分）
  ctx.strokeStyle = LINE_COLOR;
  ctx.beginPath();
  ctx.moveTo(X(0), Y(-COURT.halfWidth) + lineWidth / 2);
  ctx.lineTo(X(0), Y(COURT.halfWidth) - lineWidth / 2);
  ctx.stroke();

  // 场地边界线
  ctx.strokeRect(
    X(-COURT.halfLength) + lineWidth / 2,
    Y(-COURT.halfWidth) + lineWidth / 2,
    px(COURT.length) - lineWidth,
    px(COURT.width) - lineWidth,
  );

  // 禁区边框 + 罚球线
  for (const side of [-1, 1] as const) {
    const baselineX = side * COURT.halfLength;
    const freeThrowX = side * (COURT.halfLength - COURT.laneDepth);
    const left = Math.min(X(baselineX), X(freeThrowX));
    const top = Y(-COURT.laneWidth / 2);

    ctx.strokeRect(
      left + lineWidth / 2,
      top + lineWidth / 2,
      px(COURT.laneDepth) - lineWidth,
      px(COURT.laneWidth) - lineWidth,
    );

    // 罚球圈：朝向中场半圆实线，禁区内半圆虚线
    const circleX = X(freeThrowX);
    const circleY = Y(0);
    const radius = px(COURT.circleRadius);
    const solidStart = side === -1 ? -Math.PI / 2 : Math.PI / 2;
    const solidEnd = side === -1 ? Math.PI / 2 : (Math.PI * 3) / 2;
    const dashedStart = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    const dashedEnd = side === -1 ? (Math.PI * 3) / 2 : Math.PI / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, solidStart, solidEnd);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.setLineDash([px(0.3), px(0.22)]);
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, dashedStart, dashedEnd);
    ctx.stroke();
    ctx.restore();

    // 罚球区两侧的位置标记
    for (const zSide of [-1, 1] as const) {
      for (const distance of COURT.laneHashDistances) {
        const markX = side * (COURT.halfLength - distance);
        const innerZ = zSide * (COURT.laneWidth / 2);
        const outerZ = zSide * (COURT.laneWidth / 2 + 0.15);
        ctx.beginPath();
        ctx.moveTo(X(markX), Y(innerZ));
        ctx.lineTo(X(markX), Y(outerZ));
        ctx.stroke();
      }
    }
  }

  // 三分线：底角直线 + 弧线
  for (const side of [-1, 1] as const) {
    const basketCanvasX = X(side * BASKET_X);
    const cornerZ = COURT.threePointCornerZ;
    const arcStart =
      side === -1
        ? -THREE_POINT_CORNER_ANGLE
        : Math.PI - THREE_POINT_CORNER_ANGLE;
    const arcEnd =
      side === -1
        ? THREE_POINT_CORNER_ANGLE
        : Math.PI + THREE_POINT_CORNER_ANGLE;

    ctx.beginPath();
    ctx.arc(
      basketCanvasX,
      Y(0),
      px(COURT.threePointRadius),
      arcStart,
      arcEnd,
    );
    ctx.stroke();

    const baselineX = side * COURT.halfLength;
    const cornerX = side * THREE_POINT_CORNER_X;
    for (const zSide of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(X(baselineX), Y(zSide * cornerZ));
      ctx.lineTo(X(cornerX), Y(zSide * cornerZ));
      ctx.stroke();
    }

    // 合理冲撞区弧线 + 与篮板面平行的短线
    const restrictedStart = side === -1 ? -Math.PI / 2 : Math.PI / 2;
    const restrictedEnd =
      side === -1 ? Math.PI / 2 : (Math.PI * 3) / 2;
    ctx.beginPath();
    ctx.arc(
      basketCanvasX,
      Y(0),
      px(COURT.restrictedRadius),
      restrictedStart,
      restrictedEnd,
    );
    ctx.stroke();

    const boardX = side * BACKBOARD_X;
    for (const zSide of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(X(side * BASKET_X), Y(zSide * COURT.restrictedRadius));
      ctx.lineTo(X(boardX), Y(zSide * COURT.restrictedRadius));
      ctx.stroke();
    }
  }

  // 中圈涂装（盖住中线中段）
  const centerGradient = ctx.createRadialGradient(
    X(0),
    Y(0),
    px(0.2),
    X(0),
    Y(0),
    px(COURT.circleRadius),
  );
  centerGradient.addColorStop(0, "#fffdf6");
  centerGradient.addColorStop(0.66, "#f4efe3");
  centerGradient.addColorStop(1, "#e3dac8");
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(X(0), Y(0), px(COURT.circleRadius), 0, Math.PI * 2);
  ctx.fill();

  // 中圈深色外环，让白色贴纸像一块独立的中心地贴
  ctx.strokeStyle = "#0b0507";
  ctx.lineWidth = lineWidth * 1.15;
  ctx.beginPath();
  ctx.arc(X(0), Y(0), px(COURT.circleRadius) - lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  drawCenterEmblem(ctx, X, Y, px, logoImage);

  // 鞋底摩擦痕迹，增加真实感
  const scuffRandom = mulberry32(99);
  ctx.save();
  ctx.strokeStyle = "rgba(52, 28, 10, 0.06)";
  ctx.lineWidth = px(0.025);
  for (let i = 0; i < 16; i += 1) {
    const cx = scuffRandom() * width;
    const cy = scuffRandom() * height;
    const r = px(0.3 + scuffRandom() * 0.9);
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      r,
      scuffRandom() * Math.PI,
      scuffRandom() * Math.PI + 1,
    );
    ctx.stroke();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** 场边 LED 广告带的循环动画纹理 */
export function createLedRibbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 LED 纹理画布");

  ctx.fillStyle = "#050a14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0d1d36");
  gradient.addColorStop(0.5, "#071121");
  gradient.addColorStop(1, "#04070e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(88, 164, 255, 0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(canvas.width, 6);
  ctx.moveTo(0, canvas.height - 6);
  ctx.lineTo(canvas.width, canvas.height - 6);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 58px Arial, Helvetica, sans-serif";

  ctx.fillStyle = "#eef5ff";
  ctx.fillText("BASKETBALL", 300, 66);
  ctx.fillStyle = "#ff5a2a";
  ctx.fillText("3D", 560, 66);
  ctx.fillStyle = "#7fb6ff";
  ctx.fillText("COURT", 762, 66);

  ctx.fillStyle = "rgba(120, 180, 255, 0.6)";
  ctx.fillRect(72, 52, 4, 28);
  ctx.fillRect(948, 52, 4, 28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.needsUpdate = true;
  return texture;
}

/** 记录台正面灯箱 */
export function createLedPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建记录台纹理画布");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#060c17");
  gradient.addColorStop(0.5, "#0b1a30");
  gradient.addColorStop(1, "#060c17");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(90, 166, 255, 0.5)";
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 52px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#eef5ff";
  ctx.fillText("BASKETBALL", 330, 82);
  ctx.fillStyle = "#ff5a2a";
  ctx.fillText("·", 495, 72);
  ctx.fillStyle = "#8fc0ff";
  ctx.fillText("COURT", 655, 82);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** 中央吊屏记分牌 */
export function createScoreboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建记分牌纹理画布");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0a1729");
  gradient.addColorStop(0.5, "#050a13");
  gradient.addColorStop(1, "#03060b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#2f6fbf";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(160, 200, 255, 0.85)";
  ctx.font = "600 34px Arial, Helvetica, sans-serif";
  ctx.fillText("B A S K E T B A L L   C O U R T", 512, 54);

  ctx.fillStyle = "#dce9ff";
  ctx.font = "700 40px Arial, Helvetica, sans-serif";
  ctx.fillText("HOME", 210, 138);
  ctx.fillText("AWAY", 814, 138);

  ctx.fillStyle = "#ff6a33";
  ctx.font = "700 122px Arial, Helvetica, sans-serif";
  ctx.fillText("00", 210, 246);
  ctx.fillStyle = "#eaf2ff";
  ctx.fillText("00", 814, 246);

  ctx.strokeStyle = "rgba(120, 170, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(512, 112);
  ctx.lineTo(512, 300);
  ctx.stroke();

  ctx.fillStyle = "rgba(140, 190, 255, 0.8)";
  ctx.font = "600 38px Arial, Helvetica, sans-serif";
  ctx.fillText("Q1", 512, 182);
  ctx.fillStyle = "#f2f6ff";
  ctx.font = "700 62px Arial, Helvetica, sans-serif";
  ctx.fillText("12:00", 512, 252);

  ctx.fillStyle = "#ff3d2e";
  ctx.font = "700 92px Arial, Helvetica, sans-serif";
  ctx.fillText("24", 512, 390);

  ctx.fillStyle = "rgba(180, 210, 255, 0.6)";
  ctx.font = "600 22px Arial, Helvetica, sans-serif";
  ctx.fillText("SHOT CLOCK", 512, 448);

  // 扫描线质感
  ctx.fillStyle = "rgba(255, 255, 255, 0.018)";
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** 篮板顶部的 24 秒计时器 */
export function createShotClockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 24 秒计时器纹理画布");

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#7a1510";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 120, 100, 0.7)";
  ctx.font = "600 16px Arial, Helvetica, sans-serif";
  ctx.fillText("SHOT CLOCK", 128, 26);

  ctx.shadowColor = "rgba(255, 40, 20, 0.9)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ff3b2f";
  ctx.font = "700 82px Arial, Helvetica, sans-serif";
  ctx.fillText("24", 128, 82);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** 暗色场馆环境贴图，为木地板 / 玻璃 / 金属提供反射 */
export function createEnvironmentTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建环境纹理画布");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a3457");
  gradient.addColorStop(0.45, "#0a1526");
  gradient.addColorStop(1, "#020408");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const random = mulberry32(7);
  for (let i = 0; i < 12; i += 1) {
    const x = random() * canvas.width;
    const y = 18 + random() * 70;
    const radius = 12 + random() * 34;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, "rgba(210, 230, 255, 0.9)");
    glow.addColorStop(0.35, "rgba(120, 170, 255, 0.28)");
    glow.addColorStop(1, "rgba(120, 170, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}
