import { Collision, CollisionDetection, DroppableContainer, ClientRect } from '@dnd-kit/core';

// 自定义碰撞数据类型
export interface CustomCollisionData extends Collision {
  type: 'vertical' | 'horizontal' | 'none';
  rect?: ClientRect;
}

/**
 * 自定义碰撞检测算法
 * 检测鼠标是在组件的下方（垂直插入）还是右侧（并排插入）
 */
export const customCollisionDetection: CollisionDetection = (args) => {
  const { active, collisionRect, droppableRects, droppableContainers } = args;
  const collisions: CustomCollisionData[] = [];

  if (!collisionRect || !active) return [];

  // 计算拖拽物的中心点
  const dragCenterX = collisionRect.left + collisionRect.width / 2;
  const dragCenterY = collisionRect.top + collisionRect.height / 2;

  for (const [id, rect] of droppableRects) {
    // 跳过画布本身
    if (id === 'canvas' || id === 'canvas-grid') continue;

    // 1. 基础相交检测
    const isIntersecting = 
      collisionRect.left < rect.right &&
      collisionRect.right > rect.left &&
      collisionRect.top < rect.bottom &&
      collisionRect.bottom > rect.top;

    if (isIntersecting) {
      // 2. 计算目标组件的中心点和关键阈值
      const targetCenterX = rect.left + rect.width / 2;
      const targetCenterY = rect.top + rect.height / 2;
      
      // 右侧30%区域的阈值
      const horizontalThreshold = rect.left + rect.width * 0.7;
      
      // 垂直方向的阈值（中间线）
      const verticalThreshold = targetCenterY;

      // 3. 判断碰撞类型
      let collisionType: 'vertical' | 'horizontal' = 'vertical';
      
      // 策略：
      // - 如果鼠标在组件的右侧 30% 区域 -> 判定为 Horizontal (并排)
      // - 否则 -> 判定为 Vertical (垂直插入)
      if (dragCenterX > horizontalThreshold) {
        collisionType = 'horizontal';
      } else {
        // 根据垂直位置判断是插入前面还是后面
        // 这里统一返回 vertical，具体前后位置在 onDragOver 中处理
        collisionType = 'vertical';
      }

      collisions.push({
        id,
        type: collisionType,
        rect,
        data: {
          type: collisionType,
        },
      });
    }
  }
  
  // 按距离排序，优先选择最近的碰撞
  return collisions.sort((a, b) => {
    const rectA = a.rect;
    const rectB = b.rect;
    if (!rectA || !rectB) return 0;
    
    const distanceA = Math.hypot(
      (rectA.left + rectA.width / 2) - dragCenterX,
      (rectA.top + rectA.height / 2) - dragCenterY
    );
    const distanceB = Math.hypot(
      (rectB.left + rectB.width / 2) - dragCenterX,
      (rectB.top + rectB.height / 2) - dragCenterY
    );
    
    return distanceA - distanceB;
  });
};

/**
 * 简化版本：只检测最接近的碰撞
 */
export const closestCollisionDetection: CollisionDetection = (args) => {
  const collisions = customCollisionDetection(args);
  return collisions.slice(0, 1);
};
