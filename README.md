# 3D Demo · Three.js 实验场

一个基于 **Next.js 16 + React 19 + Three.js** 的实时 3D 演示项目，包含四个可交互的 WebGL 场景：基础几何体、由 SketchUp 转换的人物模型，以及按 NBA 官方尺寸程序化搭建的篮球场。

## 场景一览

| 路由 | 场景 | 说明 |
| --- | --- | --- |
| `/` | 首页 | 场景索引卡片，点击进入对应演示 |
| `/3d` | 旋转立方体 | 六面异色 + 棱边描线，拖拽旋转、松手带惯性 |
| `/3d-jie` | 3D 劫 | 加载 `public/models/jie.glb`，自动旋转、拖拽查看、滚轮缩放，带加载进度 |
| `/3d-yasuo` | 3D 亚索 | 加载 `public/models/yasuo.glb`，环境光照 + 自动旋转、拖拽、滚轮缩放 |
| `/basketball-court` | NBA 标准篮球场 | 按 94 ft × 50 ft 官方尺寸程序化建模，公牛主题中圈徽标、LED 广告牌、记分牌，支持视角重置 |

## 技术栈

- **框架**：Next.js 16（App Router，默认 Turbopack 构建）
- **UI**：React 19 + Tailwind CSS 4（通过 `@tailwindcss/turbopack` 处理样式）
- **3D**：Three.js 0.186（`GLTFLoader`、`OrbitControls`、`RoomEnvironment` 等）
- **语言/规范**：TypeScript 5 + ESLint 9（`eslint-config-next`）

## 环境要求

- **Node.js ≥ 20.9**（Next.js 16 的最低要求）
- npm（仓库包含 `package-lock.json`）
- 支持 WebGL 2 的现代浏览器（Chrome 111+、Edge 111+、Firefox 111+、Safari 16.4+）

## 安装依赖

```bash
npm install
```

如需严格按锁文件安装（CI 或部署环境推荐）：

```bash
npm ci
```

## 本地开发

```bash
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

默认端口被占用时可指定端口：

```bash
npm run dev -- -p 3001
```

## 生产打包与启动

```bash
# 构建生产版本（输出到 .next/）
npm run build

# 启动生产服务器（需先执行 build）
npm run start
```

同样支持自定义端口：

```bash
npm run start -- -p 4000
```

构建时会预渲染静态页面；`public/` 下的模型与图片会作为静态资源原样提供，建议部署到支持静态文件服务的 Node 运行环境或 Vercel 等平台。

## 代码检查

```bash
npm run lint
```

## 目录结构

```
3d-demo/
├── app/
│   ├── layout.tsx                     # 根布局与字体、全局样式
│   ├── page.tsx                       # 首页：场景索引卡片
│   ├── globals.css                    # Tailwind 入口与全局变量
│   ├── 3d/page.tsx                    # 旋转立方体场景
│   ├── 3d-jie/
│   │   ├── page.tsx                   # 劫：页面元数据
│   │   └── jie-scene.tsx              # 劫：Three.js 场景与交互
│   ├── 3d-yasuo/
│   │   ├── page.tsx                   # 亚索：页面元数据
│   │   └── yasuo-scene.tsx            # 亚索：Three.js 场景与交互
│   └── basketball-court/
│       ├── page.tsx                   # 篮球场：页面元数据
│       ├── basketball-court-scene.tsx # 场景搭建、灯光、交互、UI
│       ├── court.ts                   # NBA 场地尺寸常量与几何推导
│       └── textures.ts                # Canvas 程序化贴图（木地板、LED、记分牌等）
├── public/
│   ├── models/
│   │   ├── jie.glb                    # 劫模型（约 37 MB）
│   │   └── yasuo.glb                  # 亚索模型（约 1.1 MB）
│   └── bulls-logo.png                 # 公牛队徽素材
├── docs/
│   ├── jie.skp                        # SketchUp 源模型
│   └── yasuo.skp                      # SketchUp 源模型
├── next.config.ts                     # Turbopack、cacheComponents、预取配置
├── eslint.config.mjs
├── tsconfig.json
└── package.json
```

## 模型资源说明

浏览器无法直接加载 `.skp` 文件。`docs/` 中的 SketchUp 源模型通过 npm 包 [`openskp`](https://www.npmjs.com/package/openskp) 在 Node 环境中转换为 GLB，产物放在 `public/models/`，页面端仅用 `GLTFLoader` 加载 `.glb`。

替换或新增模型时：

1. 将 `.skp` 源文件放入 `docs/`；
2. 使用 `openskp` 的 `SkpFile.open(src).buildScene()` 构建场景并 `toGLB(scene)` 导出；
3. 将生成的 `.glb` 放到 `public/models/`，并在对应 `*-scene.tsx` 中修改 `MODEL_URL`。

> 注意：`openskp` 只识别 PNG/JPEG 贴图，SketchUp 常见的 TGA 贴图会被丢弃；需要在转换后自行把 TGA 解码为 PNG 并注入 GLB 的 image/texture，否则模型只剩材质平均色。

## Next.js 配置说明

`next.config.ts` 中启用了：

- **Turbopack**：Next.js 16 默认打包器，项目通过 `turbopack.rules` 指定 `*.css` 由 `@tailwindcss/turbopack` 处理；
- **cacheComponents**：启用组件级缓存模型；
- **partialPrefetching**：开启部分预取。

若需要回退到 Webpack，可执行 `next dev --webpack` / `next build --webpack`。
