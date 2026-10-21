/**
 * NBA 标准篮球场尺寸，单位统一为米（按官方英尺 / 英寸标注换算）。
 * 所有标线宽 2 in，场地 94 ft × 50 ft。
 */
export const COURT = {
  length: 28.6512, // 94 ft
  width: 15.24, // 50 ft
  halfLength: 14.3256,
  halfWidth: 7.62,
  lineWidth: 0.0508, // 2 in

  laneWidth: 4.8768, // 16 ft
  laneDepth: 5.7912, // 罚球线距底线 19 ft

  circleRadius: 1.8288, // 中圈 / 罚球圈 6 ft
  threePointRadius: 7.239, // 三分弧顶 23 ft 9 in
  threePointCornerZ: 6.7056, // 底角三分线距中线 22 ft（距边线 3 ft）

  backboardFromBaseline: 1.2192, // 篮板距底线 4 ft
  basketFromBaseline: 1.6002, // 篮筐中心距底线 5 ft 3 in
  restrictedRadius: 1.2192, // 合理冲撞区 4 ft

  rimHeight: 3.048, // 篮筐高度 10 ft
  rimRadius: 0.2286, // 篮圈直径 18 in
  rimOffset: 0.381, // 篮圈中心距篮板 15 in

  backboardWidth: 1.8288, // 6 ft
  backboardHeight: 1.0668, // 42 in
  backboardBottom: 2.8956, // 9 ft 6 in

  targetWidth: 0.6096, // 篮板内框 24 in
  targetHeight: 0.4572, // 篮板内框 18 in

  laneHashDistances: [2.1336, 2.5908, 3.3528, 4.2672], // 7 / 8.5 / 11 / 14 ft
} as const;

/** 篮筐中心到球场中线的距离 */
export const BASKET_X = COURT.halfLength - COURT.basketFromBaseline;

/** 篮板正面到球场中线的距离 */
export const BACKBOARD_X = COURT.halfLength - COURT.backboardFromBaseline;

/** 底角三分直线与弧线交点距中线的距离 */
export const THREE_POINT_CORNER_X =
  BASKET_X -
  Math.sqrt(COURT.threePointRadius ** 2 - COURT.threePointCornerZ ** 2);

/** 底角直线与三分弧的交点角度 */
export const THREE_POINT_CORNER_ANGLE = Math.asin(
  COURT.threePointCornerZ / COURT.threePointRadius,
);
