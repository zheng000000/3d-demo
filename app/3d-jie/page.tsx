import type { Metadata } from "next";
import JieScene from "./jie-scene";

export const metadata: Metadata = {
  title: "3D 劫 | 3D Demo",
  description: "使用 Three.js 加载 SketchUp 模型并实时渲染的 3D 场景",
};

export default function JiePage() {
  return <JieScene />;
}
