import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "3D 实验场 | 3D Demo",
  description: "四组 Three.js 实时 3D 场景：旋转立方体、劫、亚索与 NBA 标准篮球场。",
};

type Showcase = {
  href: string;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
  accent: string;
  gradient: string;
  art: ReactNode;
};

const showcases: Showcase[] = [
  {
    href: "/3d",
    index: "01",
    eyebrow: "Primitives",
    title: "旋转立方体",
    description: "拖拽旋转、松手带惯性。六面异色的基础光影练习。",
    tags: ["Three.js", "惯性拖拽"],
    accent: "border-orange-300/30 bg-orange-400/10 text-orange-200",
    gradient: "from-orange-500/25 via-fuchsia-500/10 to-transparent",
    art: <CubeArt />,
  },
  {
    href: "/3d-jie",
    index: "02",
    eyebrow: "Model",
    title: "3D 劫",
    description: "由 SketchUp 模型转换而来，自动旋转展示忍者轮廓。",
    tags: ["GLB 模型", "自动旋转"],
    accent: "border-violet-300/30 bg-violet-400/10 text-violet-200",
    gradient: "from-violet-500/25 via-indigo-500/10 to-transparent",
    art: <JieArt />,
  },
  {
    href: "/3d-yasuo",
    index: "03",
    eyebrow: "Model",
    title: "3D 亚索",
    description: "细节完整的人物模型，支持拖拽旋转与滚轮缩放。",
    tags: ["GLB 模型", "滚轮缩放"],
    accent: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
    gradient: "from-cyan-500/25 via-sky-500/10 to-transparent",
    art: <YasuoArt />,
  },
  {
    href: "/basketball-court",
    index: "04",
    eyebrow: "Scene",
    title: "NBA 标准篮球场",
    description: "按官方尺寸程序化还原，芝加哥公牛主题中圈徽标。",
    tags: ["程序化建模", "视角重置"],
    accent: "border-red-300/30 bg-red-400/10 text-red-200",
    gradient: "from-red-500/25 via-orange-500/10 to-transparent",
    art: <CourtArt />,
  },
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#06070d] text-white">
      <Backdrop />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-10 sm:px-8 sm:py-14 lg:py-20">
        <header className="flex items-end justify-between gap-8">
          <div>
            <p className="flex items-center gap-2.5 text-[10px] tracking-[0.42em] text-white/40 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_12px_2px_rgba(251,146,60,0.55)]" />
              Three.js Playground
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                3D 实验场
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/45">
              四组实时三维场景，点击卡片进入。拖拽旋转、滚轮缩放，感受 WebGL 的交互。
            </p>
          </div>

          <div className="hidden shrink-0 border-l border-white/10 pl-7 pb-1 lg:block">
            <p className="font-mono text-5xl font-light leading-none text-white/90">
              04
            </p>
            <p className="mt-3 text-[10px] tracking-[0.35em] text-white/30 uppercase">
              Interactive scenes
            </p>
          </div>
        </header>

        <section className="mt-10 grid flex-1 content-start gap-4 sm:mt-12 sm:grid-cols-2 lg:gap-5">
          {showcases.map((item) => (
            <ShowcaseCard key={item.href} item={item} />
          ))}
        </section>

        <footer className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-[10px] tracking-[0.22em] text-white/25 uppercase sm:flex-row sm:items-center">
          <p>Three.js · WebGL · Real-time rendering</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_1px_rgba(52,211,153,0.5)]" />
            All scenes live
          </p>
        </footer>
      </div>
    </main>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="absolute top-1/4 -right-32 h-[32rem] w-[32rem] rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="absolute -bottom-64 left-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 15%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 15%, transparent 72%)",
        }}
      />
    </div>
  );
}

function ShowcaseCard({ item }: { item: Showcase }) {
  return (
    <Link
      href={item.href}
      className="group relative flex flex-col rounded-[26px] border border-white/10 bg-white/[0.035] p-2 outline-none transition-all duration-500 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.06] focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <div
        className={`relative h-52 overflow-hidden rounded-[20px] bg-gradient-to-br ${item.gradient}`}
      >
        {/* 预览图底纹 */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 115%, rgba(255,255,255,0.16), transparent 62%)",
          }}
        />

        <span className="absolute top-4 left-4 font-mono text-[11px] tracking-[0.2em] text-white/50">
          {item.index}
        </span>
        <span className="absolute top-4 right-4 text-[9px] tracking-[0.3em] text-white/35 uppercase">
          {item.eyebrow}
        </span>

        <div className="absolute inset-0 flex items-center justify-center pt-2 transition-transform duration-700 ease-out group-hover:scale-[1.06]">
          {item.art}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-wide text-white/95 sm:text-xl">
            {item.title}
          </h2>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition-all duration-300 group-hover:border-white/30 group-hover:bg-white/10 group-hover:text-white">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5 -rotate-45 transition-transform duration-300 group-hover:rotate-0"
              aria-hidden
            >
              <path
                d="M2 8h11M8.5 3.5 13 8l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        <p className="mt-2 text-[13px] leading-6 text-white/40">
          {item.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full border px-2.5 py-1 text-[10px] tracking-wider ${item.accent}`}
            >
              {tag}
            </span>
          ))}
          <span className="ml-auto text-[10px] tracking-[0.22em] text-white/25 uppercase transition-colors duration-300 group-hover:text-white/55">
            Enter
          </span>
        </div>
      </div>
    </Link>
  );
}

function CubeArt() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-44 w-44 drop-shadow-[0_24px_50px_rgba(249,115,22,0.22)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="cubeGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <polygon
          points="100,28 168,64 100,100 32,64"
          fill="#fb923c"
          fillOpacity="0.9"
        />
        <polygon
          points="32,64 100,100 100,172 32,136"
          fill="#6366f1"
          fillOpacity="0.85"
        />
        <polygon
          points="168,64 100,100 100,172 168,136"
          fill="#a855f7"
          fillOpacity="0.78"
        />
      </g>
      <polygon
        points="100,28 168,64 100,100 32,64"
        fill="url(#cubeGloss)"
      />
    </svg>
  );
}

function JieArt() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-44 w-44 drop-shadow-[0_24px_50px_rgba(139,92,246,0.3)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="jieBlade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle
        cx="100"
        cy="100"
        r="62"
        fill="none"
        stroke="rgba(196,181,253,0.32)"
        strokeWidth="1"
        strokeDasharray="4 8"
        className="animate-spin [animation-duration:26s]"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <circle
        cx="100"
        cy="100"
        r="78"
        fill="none"
        stroke="rgba(236,72,153,0.2)"
        strokeWidth="1"
        strokeDasharray="2 10"
        className="animate-spin [animation-direction:reverse] [animation-duration:36s]"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      <path
        d="M100 16 L119 81 L184 100 L119 119 L100 184 L81 119 L16 100 L81 81 Z"
        fill="url(#jieBlade)"
        fillOpacity="0.92"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M100 16 L119 81 L100 100 L81 81 Z"
        fill="#ffffff"
        fillOpacity="0.22"
      />
      <circle
        cx="100"
        cy="100"
        r="13"
        fill="#0b1020"
        stroke="#ddd6fe"
        strokeWidth="2"
      />
      <circle cx="100" cy="100" r="4" fill="#f0abfc" />
    </svg>
  );
}

function YasuoArt() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-44 w-44 drop-shadow-[0_24px_50px_rgba(14,165,233,0.28)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="windLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="url(#windLine)"
        strokeLinecap="round"
        className="animate-pulse [animation-duration:4s]"
      >
        <path
          d="M38 78 C68 46 122 42 156 68 C178 85 180 112 162 128"
          strokeWidth="6"
          opacity="0.9"
        />
        <path
          d="M46 112 C68 94 104 94 128 108 C148 120 152 142 142 158"
          strokeWidth="4"
          opacity="0.55"
        />
        <path
          d="M62 52 C86 32 126 30 152 44"
          strokeWidth="3"
          opacity="0.4"
        />
        <path
          d="M30 138 C50 152 78 158 104 152"
          strokeWidth="2"
          opacity="0.3"
        />
      </g>
      <path
        d="M74 166 L143 57"
        stroke="rgba(224,242,254,0.9)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M143 57 L155 41 L149 62 Z" fill="#e0f2fe" fillOpacity="0.9" />
      <path
        d="M69 171 L84 163"
        stroke="#f0f9ff"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CourtArt() {
  return (
    <svg
      viewBox="0 0 260 160"
      className="w-[88%] max-w-[270px] drop-shadow-[0_20px_45px_rgba(239,68,68,0.25)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="courtWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c2d12" />
          <stop offset="100%" stopColor="#431407" />
        </linearGradient>
        <linearGradient id="courtLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <pattern
          id="courtGrain"
          width="240"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="6"
            x2="240"
            y2="6"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect
        x="8"
        y="8"
        width="244"
        height="144"
        rx="10"
        fill="url(#courtWood)"
      />
      <rect
        x="8"
        y="8"
        width="244"
        height="144"
        rx="10"
        fill="url(#courtGrain)"
      />
      <rect
        x="8"
        y="8"
        width="244"
        height="144"
        rx="10"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />

      <g
        fill="none"
        stroke="url(#courtLine)"
        strokeWidth="2"
        opacity="0.92"
      >
        <rect x="20" y="22" width="220" height="116" rx="2" />
        <line x1="130" y1="22" x2="130" y2="138" />
        <circle cx="130" cy="80" r="17" />
        <rect x="20" y="52" width="46" height="56" />
        <rect x="194" y="52" width="46" height="56" />
        <circle cx="66" cy="80" r="13" />
        <circle cx="194" cy="80" r="13" />
        <path d="M20 32 Q 82 44 82 80 Q 82 116 20 128" />
        <path d="M240 32 Q 178 44 178 80 Q 178 116 240 128" />
      </g>

      <g fill="url(#courtLine)">
        <circle cx="30" cy="80" r="3" />
        <circle cx="230" cy="80" r="3" />
        <circle cx="130" cy="80" r="9" />
      </g>
      <text
        x="130"
        y="82"
        textAnchor="middle"
        fontSize="4.6"
        fontWeight="700"
        letterSpacing="0.2"
        fill="#fff"
      >
        BULLS
      </text>
    </svg>
  );
}
