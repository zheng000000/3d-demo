import type { Metadata } from "next";
import YasuoScene from "./yasuo-scene";

export const metadata: Metadata = {
  title: "3D 亚索 | 3D Demo",
  description: "使用 Three.js 加载 SketchUp 模型并实时渲染的 3D 场景",
};

export default function YasuoPage() {
  return <YasuoScene />;
}
