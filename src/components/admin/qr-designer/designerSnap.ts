import { PosterElement } from '../../../types/posterDesigner';

export interface SnapGuideline {
  id: string;
  type: 'vertical' | 'horizontal';
  position: number; // In canvas coordinates (px)
  label?: string;
  color?: string;
  matchedType: 'canvas_center' | 'canvas_edge' | 'element_align' | 'user_guide';
}

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  guidelines: SnapGuideline[];
}

const SNAP_THRESHOLD = 8; // Pixels in canvas space

/**
 * Super precise 1000% magnetic snapping algorithm
 * Snaps to:
 * - Canvas Center X & Center Y
 * - Canvas Edges (0, canvasWidth, canvasHeight) & Margins (40px)
 * - Other elements' Left, Center X, Right, Top, Center Y, Bottom
 */
export function calculateElementSnap(
  el: { x: number; y: number; width: number; height: number },
  proposedX: number,
  proposedY: number,
  otherElements: PosterElement[],
  canvasWidth: number,
  canvasHeight: number,
  snapEnabled: boolean = true,
  userGuidelines: { type: 'horizontal' | 'vertical'; position: number }[] = []
): SnapResult {
  if (!snapEnabled) {
    return {
      snappedX: proposedX,
      snappedY: proposedY,
      guidelines: []
    };
  }

  let finalX = proposedX;
  let finalY = proposedY;
  const guidelines: SnapGuideline[] = [];

  const elCenterX = proposedX + el.width / 2;
  const elRight = proposedX + el.width;
  const elCenterY = proposedY + el.height / 2;
  const elBottom = proposedY + el.height;

  // -------------------------------------------------------------
  // X-AXIS SNAPPING
  // -------------------------------------------------------------
  let minDiffX = SNAP_THRESHOLD;
  let bestSnapX: number | null = null;
  let bestGuideX: SnapGuideline | null = null;

  // 1. Canvas Center X
  const canvasCenterX = Math.round(canvasWidth / 2);
  const diffCanvasCenterX = Math.abs(elCenterX - canvasCenterX);
  if (diffCanvasCenterX < minDiffX) {
    minDiffX = diffCanvasCenterX;
    bestSnapX = canvasCenterX - el.width / 2;
    bestGuideX = {
      id: 'guide-canvas-center-x',
      type: 'vertical',
      position: canvasCenterX,
      label: 'المنتصف الأفقي (Center X)',
      color: '#ec4899', // Vibrant Pink
      matchedType: 'canvas_center'
    };
  }

  // 2. Canvas Left / Right Margins & Edges
  const xTargets = [
    { pos: 0, label: 'حافة الكانفاس اليسرى', type: 'canvas_edge' as const },
    { pos: 40, label: 'هامش الأمان 40px', type: 'canvas_edge' as const },
    { pos: canvasWidth - 40, label: 'هامش الأمان 40px', type: 'canvas_edge' as const },
    { pos: canvasWidth, label: 'حافة الكانفاس اليمنى', type: 'canvas_edge' as const }
  ];

  for (const target of xTargets) {
    // Snap el.left to target
    const diffLeft = Math.abs(proposedX - target.pos);
    if (diffLeft < minDiffX) {
      minDiffX = diffLeft;
      bestSnapX = target.pos;
      bestGuideX = {
        id: `guide-x-${target.pos}`,
        type: 'vertical',
        position: target.pos,
        label: target.label,
        color: '#06b6d4',
        matchedType: target.type
      };
    }

    // Snap el.right to target
    const diffRight = Math.abs(elRight - target.pos);
    if (diffRight < minDiffX) {
      minDiffX = diffRight;
      bestSnapX = target.pos - el.width;
      bestGuideX = {
        id: `guide-x-${target.pos}`,
        type: 'vertical',
        position: target.pos,
        label: target.label,
        color: '#06b6d4',
        matchedType: target.type
      };
    }
  }

  // 3. User Guidelines on X
  for (const ug of userGuidelines.filter(g => g.type === 'vertical')) {
    const diff = Math.abs(proposedX - ug.position);
    if (diff < minDiffX) {
      minDiffX = diff;
      bestSnapX = ug.position;
      bestGuideX = {
        id: `guide-user-x-${ug.position}`,
        type: 'vertical',
        position: ug.position,
        label: `مسطرة: ${Math.round(ug.position)}px`,
        color: '#3b82f6',
        matchedType: 'user_guide'
      };
    }
    const diffR = Math.abs(elRight - ug.position);
    if (diffR < minDiffX) {
      minDiffX = diffR;
      bestSnapX = ug.position - el.width;
      bestGuideX = {
        id: `guide-user-x-${ug.position}`,
        type: 'vertical',
        position: ug.position,
        label: `مسطرة: ${Math.round(ug.position)}px`,
        color: '#3b82f6',
        matchedType: 'user_guide'
      };
    }
  }

  // 4. Other Elements X Targets
  for (const other of otherElements) {
    if (other.hidden) continue;

    const otherLeft = other.x;
    const otherCenterX = other.x + other.width / 2;
    const otherRight = other.x + other.width;

    // Center-to-Center X
    const diffC2C = Math.abs(elCenterX - otherCenterX);
    if (diffC2C < minDiffX) {
      minDiffX = diffC2C;
      bestSnapX = otherCenterX - el.width / 2;
      bestGuideX = {
        id: `guide-elem-cx-${other.id}`,
        type: 'vertical',
        position: otherCenterX,
        label: `محاذاة لوسط: ${other.name}`,
        color: '#10b981', // Emerald
        matchedType: 'element_align'
      };
    }

    // Left-to-Left
    const diffL2L = Math.abs(proposedX - otherLeft);
    if (diffL2L < minDiffX) {
      minDiffX = diffL2L;
      bestSnapX = otherLeft;
      bestGuideX = {
        id: `guide-elem-l2l-${other.id}`,
        type: 'vertical',
        position: otherLeft,
        label: `محاذاة لبداية: ${other.name}`,
        color: '#10b981',
        matchedType: 'element_align'
      };
    }

    // Right-to-Right
    const diffR2R = Math.abs(elRight - otherRight);
    if (diffR2R < minDiffX) {
      minDiffX = diffR2R;
      bestSnapX = otherRight - el.width;
      bestGuideX = {
        id: `guide-elem-r2r-${other.id}`,
        type: 'vertical',
        position: otherRight,
        label: `محاذاة لنهاية: ${other.name}`,
        color: '#10b981',
        matchedType: 'element_align'
      };
    }
  }

  if (bestSnapX !== null) {
    finalX = bestSnapX;
    if (bestGuideX) guidelines.push(bestGuideX);
  }

  // -------------------------------------------------------------
  // Y-AXIS SNAPPING
  // -------------------------------------------------------------
  let minDiffY = SNAP_THRESHOLD;
  let bestSnapY: number | null = null;
  let bestGuideY: SnapGuideline | null = null;

  // 1. Canvas Center Y
  const canvasCenterY = Math.round(canvasHeight / 2);
  const diffCanvasCenterY = Math.abs(elCenterY - canvasCenterY);
  if (diffCanvasCenterY < minDiffY) {
    minDiffY = diffCanvasCenterY;
    bestSnapY = canvasCenterY - el.height / 2;
    bestGuideY = {
      id: 'guide-canvas-center-y',
      type: 'horizontal',
      position: canvasCenterY,
      label: 'المنتصف الرأسي (Center Y)',
      color: '#ec4899', // Vibrant Pink
      matchedType: 'canvas_center'
    };
  }

  // 2. Canvas Top / Bottom Margins & Edges
  const yTargets = [
    { pos: 0, label: 'أعلى الكانفاس', type: 'canvas_edge' as const },
    { pos: 40, label: 'هامش علوي 40px', type: 'canvas_edge' as const },
    { pos: canvasHeight - 40, label: 'هامش سفلي 40px', type: 'canvas_edge' as const },
    { pos: canvasHeight, label: 'أسفل الكانفاس', type: 'canvas_edge' as const }
  ];

  for (const target of yTargets) {
    // Snap el.top to target
    const diffTop = Math.abs(proposedY - target.pos);
    if (diffTop < minDiffY) {
      minDiffY = diffTop;
      bestSnapY = target.pos;
      bestGuideY = {
        id: `guide-y-${target.pos}`,
        type: 'horizontal',
        position: target.pos,
        label: target.label,
        color: '#06b6d4',
        matchedType: target.type
      };
    }

    // Snap el.bottom to target
    const diffBottom = Math.abs(elBottom - target.pos);
    if (diffBottom < minDiffY) {
      minDiffY = diffBottom;
      bestSnapY = target.pos - el.height;
      bestGuideY = {
        id: `guide-y-${target.pos}`,
        type: 'horizontal',
        position: target.pos,
        label: target.label,
        color: '#06b6d4',
        matchedType: target.type
      };
    }
  }

  // 3. User Guidelines on Y
  for (const ug of userGuidelines.filter(g => g.type === 'horizontal')) {
    const diff = Math.abs(proposedY - ug.position);
    if (diff < minDiffY) {
      minDiffY = diff;
      bestSnapY = ug.position;
      bestGuideY = {
        id: `guide-user-y-${ug.position}`,
        type: 'horizontal',
        position: ug.position,
        label: `مسطرة: ${Math.round(ug.position)}px`,
        color: '#3b82f6',
        matchedType: 'user_guide'
      };
    }
    const diffB = Math.abs(elBottom - ug.position);
    if (diffB < minDiffY) {
      minDiffY = diffB;
      bestSnapY = ug.position - el.height;
      bestGuideY = {
        id: `guide-user-y-${ug.position}`,
        type: 'horizontal',
        position: ug.position,
        label: `مسطرة: ${Math.round(ug.position)}px`,
        color: '#3b82f6',
        matchedType: 'user_guide'
      };
    }
  }

  // 4. Other Elements Y Targets
  for (const other of otherElements) {
    if (other.hidden) continue;

    const otherTop = other.y;
    const otherCenterY = other.y + other.height / 2;
    const otherBottom = other.y + other.height;

    // Center-to-Center Y
    const diffC2CY = Math.abs(elCenterY - otherCenterY);
    if (diffC2CY < minDiffY) {
      minDiffY = diffC2CY;
      bestSnapY = otherCenterY - el.height / 2;
      bestGuideY = {
        id: `guide-elem-cy-${other.id}`,
        type: 'horizontal',
        position: otherCenterY,
        label: `محاذاة لوسط: ${other.name}`,
        color: '#10b981', // Emerald
        matchedType: 'element_align'
      };
    }

    // Top-to-Top
    const diffT2T = Math.abs(proposedY - otherTop);
    if (diffT2T < minDiffY) {
      minDiffY = diffT2T;
      bestSnapY = otherTop;
      bestGuideY = {
        id: `guide-elem-t2t-${other.id}`,
        type: 'horizontal',
        position: otherTop,
        label: `محاذاة لأعلى: ${other.name}`,
        color: '#10b981',
        matchedType: 'element_align'
      };
    }

    // Bottom-to-Bottom
    const diffB2B = Math.abs(elBottom - otherBottom);
    if (diffB2B < minDiffY) {
      minDiffY = diffB2B;
      bestSnapY = otherBottom - el.height;
      bestGuideY = {
        id: `guide-elem-b2b-${other.id}`,
        type: 'horizontal',
        position: otherBottom,
        label: `محاذاة لأسفل: ${other.name}`,
        color: '#10b981',
        matchedType: 'element_align'
      };
    }
  }

  if (bestSnapY !== null) {
    finalY = bestSnapY;
    if (bestGuideY) guidelines.push(bestGuideY);
  }

  return {
    snappedX: Math.round(finalX),
    snappedY: Math.round(finalY),
    guidelines
  };
}

/**
 * Converts list of drawn 2D points into an SVG Path string
 */
export function pointsToSvgPath(points: { x: number; y: number }[], closed: boolean = false): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  if (points.length === 2) {
    path += ` L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  } else {
    // Smooth Catmull-Rom or Quadratic bezier curves
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      path += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}, ${xc.toFixed(1)} ${yc.toFixed(1)}`;
    }
    const last = points[points.length - 1];
    path += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  }

  if (closed) {
    path += ' Z';
  }

  return path;
}
