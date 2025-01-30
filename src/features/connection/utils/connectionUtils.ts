import type { Box } from '@/features/box/types';
import type { ConnectionPoint, ConnectionPoints } from '../types';

export const calculateConnectionPoints = (startBox: Box, endBox: Box): ConnectionPoints => {
  // 시작 박스와 끝 박스의 중심점 계산
  const startCenter = {
    x: startBox.x + startBox.width / 2,
    y: startBox.y + startBox.height / 2,
  };

  const endCenter = {
    x: endBox.x + endBox.width / 2,
    y: endBox.y + endBox.height / 2,
  };

  // 시작점과 끝점 결정
  const start = findIntersectionPoint(startBox, startCenter, endCenter);
  const end = findIntersectionPoint(endBox, endCenter, startCenter);

  // 베지어 곡선의 제어점 계산
  const distance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );
  const controlDistance = distance / 3;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const controlPoints: [ConnectionPoint, ConnectionPoint] = [
    {
      x: start.x + Math.cos(angle) * controlDistance,
      y: start.y + Math.sin(angle) * controlDistance,
    },
    {
      x: end.x - Math.cos(angle) * controlDistance,
      y: end.y - Math.sin(angle) * controlDistance,
    },
  ];

  return { start, end, controlPoints };
};

const findIntersectionPoint = (box: Box, from: ConnectionPoint, to: ConnectionPoint): ConnectionPoint => {
  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;

  // 박스와 선의 교차점 계산
  let x: number;
  let y: number;

  if (Math.abs(Math.cos(angle)) * halfHeight > Math.abs(Math.sin(angle)) * halfWidth) {
    // 수평 방향 교차
    x = center.x + (Math.cos(angle) > 0 ? halfWidth : -halfWidth);
    y = center.y + Math.tan(angle) * (x - center.x);
  } else {
    // 수직 방향 교차
    y = center.y + (Math.sin(angle) > 0 ? halfHeight : -halfHeight);
    x = center.x + (y - center.y) / Math.tan(angle);
  }

  return { x, y };
};

export const isPointNearLine = (
  point: ConnectionPoint,
  start: ConnectionPoint,
  end: ConnectionPoint,
  threshold: number = 5
): boolean => {
  const lineLength = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );

  if (lineLength === 0) return false;

  const distance =
    Math.abs(
      (end.y - start.y) * point.x -
        (end.x - start.x) * point.y +
        end.x * start.y -
        end.y * start.x
    ) / lineLength;

  return distance <= threshold;
}; 
