// Repère logique commun à tous les jeux canvas (portrait 9:16) + outils "cartoon"
export const W = 360;
export const H = 640;
export const FONT = "'Fredoka','Baloo 2',ui-rounded,'Trebuchet MS',system-ui,sans-serif";
export const INK = '#1f1a2e';
export const C1 = '#19b5fe'; // joueur 1 (bas)
export const C2 = '#ff3d7f'; // joueur 2 (haut)

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function pos(e, cv) {
  const r = cv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
}

export const loopState = { paused: false };

export function startLoop(fn) {
  let id;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!loopState.paused) fn(dt);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

export function ink(ctx, w = 3) {
  ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
}

// disque avec contour épais, ombre dure et reflet
export function blob(ctx, x, y, r, fill, o = {}) {
  const { w = 3, shadow = 3, hl = true } = o;
  if (shadow) {
    ctx.fillStyle = 'rgba(31,26,46,.3)';
    ctx.beginPath(); ctx.arc(x + shadow, y + shadow + 1, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  if (w) { ink(ctx, w); ctx.stroke(); }
  if (hl && r > 7) {
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = Math.max(2, r * 0.17);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, Math.PI * 1.12, Math.PI * 1.45); ctx.stroke();
  }
}

export function slab(ctx, x, y, w, h, r, fill, o = {}) {
  const { lw = 3, shadow = 4 } = o;
  if (shadow) {
    ctx.fillStyle = 'rgba(31,26,46,.3)';
    ctx.beginPath(); ctx.roundRect(x + shadow, y + shadow + 1, w, h, r); ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  if (lw) { ink(ctx, lw); ctx.stroke(); }
}

// texte avec contour épais
export function shout(ctx, text, x, y, size = 18, fill = '#fff') {
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = size / 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

export function banner(ctx, text, y = H / 2) {
  ctx.font = `700 17px ${FONT}`;
  const w = ctx.measureText(text).width + 36;
  slab(ctx, W / 2 - w / 2, y - 20, w, 40, 14, '#fff');
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, y + 1);
}

export function dots(ctx, base, dot = 'rgba(255,255,255,.35)') {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = dot;
  for (let y = 12; y < H; y += 28) for (let x = ((y / 28) % 2) * 14; x < W; x += 28) {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
}
