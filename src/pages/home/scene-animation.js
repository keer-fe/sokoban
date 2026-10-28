// Coordinates are measured in the approved 941 × 1672 artwork, not guessed per layer.
export const HOME_SCENE = Object.freeze({ x: 45, y: 435, width: 860, height: 660 });
export const HERO_ATLAS = Object.freeze({
  columns: 4, frames: 4, cellWidth: 384, cellHeight: 512,
  scale: .44, palm: [468, 747],
  // Absolute palm samples in each cell, one isotropic scale for all poses.
  contacts: [[344,310],[371,311],[359,314],[356,316]],
});

const crateTile = [[459,759],[588,785],[569,867],[432,840]];
// Offset each measured edge, rather than bilinearly shrinking a non-parallelogram.
// Adjacent offset-line intersections preserve all four individual ground-edge angles.
export function insetGroundQuad(points, distance) {
  const lines = points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const normal = [-dy / length, dx / length];
    return { normal, c: normal[0] * a[0] + normal[1] * a[1] + distance };
  });
  return lines.map((line, i) => {
    const previous = lines[(i + lines.length - 1) % lines.length];
    const [a,b] = previous.normal, [c,d] = line.normal;
    const determinant = a*d-b*c;
    return [(previous.c*d-b*line.c)/determinant, (a*line.c-previous.c*c)/determinant];
  });
}
export const HOME_CRATE = Object.freeze({
  tile: crateTile,
  floor: insetGroundQuad(crateTile, 10),
  inset: 10,
  height: 88,
});

export function heroFrameAt(elapsed) {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const t = (time % EFFORT_DURATION) / EFFORT_DURATION * 2.4;
  if (t < .55) return 0;
  if (t < .75) return 1;
  if (t < .95) return 2;
  if (t < 1.55) return 3;
  if (t < 1.75) return 2;
  if (t < 1.95) return 1;
  return 0;
}

export function scenePlacement(rect) {
  const scale = Math.min(rect.width / HOME_SCENE.width, rect.height / HOME_SCENE.height);
  return { scale, x: rect.x + (rect.width - HOME_SCENE.width * scale) / 2,
    y: rect.y + (rect.height - HOME_SCENE.height * scale) / 2 };
}

export const EFFORT_DURATION = 1.6;
const safeTime = value => Number.isFinite(value) ? Math.max(0, value) : 0;

// Light/sweat intensity follows the same exertion cadence; body poses are not deformed.
export function homeMotionAt(elapsed, tapAge = Infinity) {
  const time = safeTime(elapsed);
  const phase = (time % EFFORT_DURATION) / EFFORT_DURATION;
  const effort = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const accent = tapAge >= 0 && tapAge < 1.2 ? Math.sin(tapAge / 1.2 * Math.PI) ** 2 : 0;
  return { time, phase, effort, accent };
}

export function drawSteadyHero(ctx, elapsed, drawFrame) {
  const frame = heroFrameAt(elapsed);
  const [px, py] = HERO_ATLAS.contacts[frame];
  const scale = HERO_ATLAS.scale;
  // Rigid lean around the contacting palms; never squeeze the character.
  const lean = homeMotionAt(elapsed).effort * .11;
  ctx.save();
  ctx.translate(...HERO_ATLAS.palm);ctx.rotate(lean);
  ctx.translate(-HERO_ATLAS.palm[0],-HERO_ATLAS.palm[1]);
  drawFrame(ctx, frame, HERO_ATLAS.palm[0] - px * scale,
    HERO_ATLAS.palm[1] - py * scale,
    HERO_ATLAS.cellWidth * scale, HERO_ATLAS.cellHeight * scale);
  ctx.restore();
}

export const HERO_TILE = [[329,737],[459,759],[432,840],[305,818]];

// Exertion bursts radiate away from the temples/helmet, then fall under gravity.
const SWEAT_EMITTERS = [
  [350,695,-40,-46], [442,690,40,-50],
  [357,673,-48,-60], [435,666,48,-64],
];
export function sweatDropsAt(elapsed, tapAge = Infinity) {
  const { time, accent } = homeMotionAt(elapsed, tapAge);
  const phase = time % EFFORT_DURATION;
  return SWEAT_EMITTERS.map(([x,y,vx,vy], index) => {
    const age = (phase - .42 - index * .09) / .65;
    const p = Math.max(0, Math.min(1, age));
    return { x: x + vx*p, y: y + vy*p + 80*p*p,
      radius: 8.5,
      angle: Math.atan2(vy + 160*p, vx) - Math.PI/2,
      alpha: age > 0 && age < 1 ? Math.sin(Math.PI*p)*(.85+.15*accent) : 0 };
  });
}

export function drawSweat(ctx, elapsed, tapAge) {
  ctx.save();
  for (const drop of sweatDropsAt(elapsed, tapAge)) {
    ctx.save(); ctx.translate(drop.x, drop.y); ctx.rotate(drop.angle);
    ctx.globalAlpha = drop.alpha;
    const r = drop.radius;
    ctx.fillStyle = '#58C8F4'; ctx.strokeStyle = '#D7F8FF'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0,-r*1.65);
    ctx.bezierCurveTo(r*.15,-r*.5,r,r*.1,r,r*.7);
    ctx.bezierCurveTo(r,r*1.7,-r,r*1.7,-r,r*.7);
    ctx.bezierCurveTo(-r,0,-r*.2,-r*.5,0,-r*1.65);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle='#F3FDFF';ctx.beginPath();ctx.ellipse(-r*.3,r*.45,r*.18,r*.4,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Small vector accents are time-driven and bounded; no particle arrays grow over time.
export function gardenMotionAt(elapsed, width, title, scene) {
  const time = safeTime(elapsed);
  return {
    butterflies: [
      { x: width*.84 + Math.sin(time*.42)*9, y: title.y+title.height+12+Math.sin(time*.63)*7,
        size: 7, angle: -.3+Math.sin(time*.42)*.2, wing: .3+.7*Math.abs(Math.sin(time*5.2)) },
      { x: width*.12 + Math.sin(time*.31+2)*10, y: scene.y+scene.height*.78+Math.sin(time*.5)*8,
        size: 4.5, angle: .4+Math.sin(time*.3)*.2, wing: .3+.7*Math.abs(Math.sin(time*6.1+1)) },
    ],
    motes: Array.from({length:6},(_,i)=>({
      x: width*(.1+i*.16)+Math.sin(time*.28+i*2)*7,
      y: scene.y+scene.height*(.2+((i*.37)%1))+Math.sin(time*.35+i)*9,
      alpha: .12+.16*(1+Math.sin(time*.8+i))/2, radius: i%2 ? 1.6 : 1.1,
    })),
  };
}

export function drawGardenLife(ctx, elapsed, width, title, scene) {
  const { butterflies, motes } = gardenMotionAt(elapsed, width, title, scene);
  ctx.save();
  for(const p of motes){
    ctx.globalAlpha=p.alpha;ctx.fillStyle='#FFF7C2';
    ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=.88;
  for(const b of butterflies){
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);
    // Each wing closes around a fixed thorax; the butterfly itself is never stretched.
    for(const side of [-1,1]){
      ctx.save();ctx.scale(side*b.wing,1);
      const g=ctx.createLinearGradient(0,-b.size,0,b.size);
      g.addColorStop(0,'#FFE47A');g.addColorStop(1,'#E9A335');
      ctx.fillStyle=g;ctx.strokeStyle='#C78E3A';ctx.lineWidth=.6;
      ctx.beginPath();ctx.moveTo(0,0);
      ctx.bezierCurveTo(b.size*.2,-b.size*1.3,b.size*1.25,-b.size*1.4,b.size,-b.size*.15);
      ctx.bezierCurveTo(b.size*1.2,b.size*.7,b.size*.3,b.size,0,0);
      ctx.fill();ctx.stroke();ctx.restore();
    }
    ctx.strokeStyle='#825B2A';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,4);ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export function drawGoalLight(ctx, elapsed, accent = 0) {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const breathe = (1 - Math.cos(time * Math.PI * 2 / 2.4)) / 2;
  ctx.save();
  // Only additive light changes; the original target tile is part of the static base.
  const halo = ctx.createRadialGradient(640, 823, 10, 640, 823, 83);
  halo.addColorStop(0, `rgba(255,231,97,${0.08 + 0.3 * breathe + .12 * accent})`);
  halo.addColorStop(1, 'rgba(255,218,60,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(557, 740, 166, 166);
  const beam = ctx.createLinearGradient(0, 700, 0, 806);
  beam.addColorStop(0, 'rgba(255,243,173,0)');
  beam.addColorStop(1, `rgba(255,239,144,${0.10 + 0.25 * breathe + .12 * accent})`);
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(616, 704); ctx.lineTo(681, 704); ctx.lineTo(669, 806); ctx.lineTo(594, 798);
  ctx.closePath(); ctx.fill();
  const ringPhase = (time % 2.4) / 2.4;
  ctx.save();
  ctx.translate(638, 827); ctx.rotate(0.15);
  ctx.globalAlpha = Math.sin(Math.PI * ringPhase) * 0.5;
  ctx.strokeStyle = '#FFF8A5'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 0, 33 + 36 * ringPhase, 23 + 26 * ringPhase, 0, 0, Math.PI * 2);
  ctx.stroke(); ctx.restore();
  for (const [x, y, radius, offset] of [[657, 709, 12, 0], [636, 751, 9, 0.35], [680, 771, 6, 0.67]]) {
    const travel = (time / 2.4 + offset) % 1;
    const lift = 45 - 76 * travel;
    ctx.globalAlpha = Math.sin(Math.PI * travel);
    ctx.fillStyle = '#FFFDED';
    ctx.beginPath();
    ctx.moveTo(x, y - radius + lift);
    ctx.quadraticCurveTo(x + 2, y - 2 + lift, x + radius * 0.65, y + lift);
    ctx.quadraticCurveTo(x + 2, y + 2 + lift, x, y + radius + lift);
    ctx.quadraticCurveTo(x - 2, y + 2 + lift, x - radius * 0.65, y + lift);
    ctx.quadraticCurveTo(x - 2, y - 2 + lift, x, y - radius + lift);
    ctx.fill();
  }
  ctx.restore();
}
