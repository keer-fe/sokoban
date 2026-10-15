export function createViewport(info) {
  const { width, height } = info;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid canvas viewport dimensions');
  }
  const inset = (value) => Number.isFinite(value) && value >= 0 && value < height / 2 ? value : 0;
  const safeTop = inset(info.safeTop);
  const safeBottom = inset(info.safeBottom);
  const pixelRatio = Number.isFinite(info.pixelRatio) && info.pixelRatio > 0 ? info.pixelRatio : 1;
  // Scale the complete composition on short screens; keep touch coordinates in CSS pixels.
  const scale = Math.min(width / 414, (height - safeTop - safeBottom) / 780);
  return {
    width: 414,
    height: height / scale,
    scale,
    offsetX: (width - 414 * scale) / 2,
    safeTop: safeTop / scale,
    navigationCenterY: Number.isFinite(info.navigationCenterY)
      && info.navigationCenterY > 0 && info.navigationCenterY < height / 2
      ? info.navigationCenterY / scale : Math.max(36, (safeTop - 22) / scale),
    safeBottom: safeBottom / scale,
    pixelRatio,
    physicalWidth: width,
    physicalHeight: height,
  };
}

export function toLogicalPoint(viewport, point) {
  return { ...point, x: (point.x - viewport.offsetX) / viewport.scale, y: point.y / viewport.scale };
}
