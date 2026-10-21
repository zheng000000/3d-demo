import type { Metadata } from "next";
import BasketballCourtScene from "./basketball-court-scene";

export const metadata: Metadata = {
  title: "芝加哥公牛 · NBA 标准篮球场 | 3D",
  description:
    "使用 Three.js 按 NBA 官方尺寸程序化还原的篮球场 3D 场景，中圈为芝加哥公牛主题徽标，支持旋转、缩放与视角重置。",
};

export default function BasketballCourtPage() {
  return <BasketballCourtScene />;
}
