<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const MR = 30, PR = 18, GW = 120;
    const mk = (y, max) => ({ x: W / 2, y, vx: 0, vy: 0, tx: W / 2, ty: y, max });
    const m = { 1: mk(H - 100, 1800), 2: mk(100, mode === '1p' ? 420 : 1800) };
    let puck = { x: W / 2, y: H / 2 + 60, vx: 0, vy: 0 };
    let wait = 0.8;
    const owner = new Map();

    function setTarget(p, q) {
      m[p].tx = clamp(q.x, MR, W - MR);
      m[p].ty = p === 1 ? clamp(q.y, H / 2 + MR, H - MR) : clamp(q.y, MR, H / 2 - MR);
    }
    function down(e) {
      cv.setPointerCapture(e.pointerId);
      const q = pos(e, cv);
      const p = mode === '1p' || q.y > H / 2 ? 1 : 2;
      owner.set(e.pointerId, p);
      setTarget(p, q);
    }
    function move(e) {
      const p = owner.get(e.pointerId);
      if (!p) return;
      setTarget(p, pos(e, cv));
    }
    const up = (e) => owner.delete(e.pointerId);
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    function goal(p) {
      onpoint(p);
      wait = 1;
      puck = { x: W / 2, y: H / 2 + (p === 1 ? -60 : 60), vx: 0, vy: 0 };
    }

    function collide(mm) {
      const dx = puck.x - mm.x, dy = puck.y - mm.y;
      const d = Math.hypot(dx, dy);
      const min = MR + PR;
      if (d < min && d > 0) {
        const nx = dx / d, ny = dy / d;
        puck.x = mm.x + nx * min;
        puck.y = mm.y + ny * min;
        const vn = (puck.vx - mm.vx) * nx + (puck.vy - mm.vy) * ny;
        if (vn < 0) { puck.vx -= 1.9 * vn * nx; puck.vy -= 1.9 * vn * ny; sfx('hit'); }
        const sp = Math.hypot(puck.vx, puck.vy);
        if (sp > 950) { puck.vx *= 950 / sp; puck.vy *= 950 / sp; }
      }
    }

    function moveMallet(mm, dt) {
      const dx = mm.tx - mm.x, dy = mm.ty - mm.y;
      const d = Math.hypot(dx, dy);
      const step = Math.min(d, mm.max * dt);
      const ox = mm.x, oy = mm.y;
      if (d > 0.01) { mm.x += (dx / d) * step; mm.y += (dy / d) * step; }
      mm.vx = (mm.x - ox) / dt;
      mm.vy = (mm.y - oy) / dt;
    }

    function ai() {
      if (puck.y < H / 2 + 10) {
        m[2].tx = puck.x;
        m[2].ty = clamp(puck.y - 4, MR, H / 2 - MR);
      } else {
        m[2].tx = W / 2 + (puck.x - W / 2) * 0.4;
        m[2].ty = 70;
      }
    }

    function draw() {
      ctx.fillStyle = '#c9f1ff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.ellipse((i * 97) % W, (i * 151) % H, 26, 4, -0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 6; ctx.strokeStyle = '#ff5a5f';
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      ctx.strokeStyle = '#4f7cff'; ctx.beginPath(); ctx.arc(W / 2, H / 2, 52, 0, Math.PI * 2); ctx.stroke();
      slab(ctx, W / 2 - GW / 2, -12, GW, 28, 12, '#2a2140', { shadow: 0 });
      slab(ctx, W / 2 - GW / 2, H - 16, GW, 28, 12, '#2a2140', { shadow: 0 });
      for (const p of [1, 2]) {
        blob(ctx, m[p].x, m[p].y, MR, p === 1 ? C1 : C2);
        blob(ctx, m[p].x, m[p].y, MR * 0.45, '#fff', { w: 2.5, shadow: 0, hl: false });
      }
      blob(ctx, puck.x, puck.y, PR, '#2a2140');
    }

    const stop = startLoop((dt) => {
      if (mode === '1p') ai();
      moveMallet(m[1], dt);
      moveMallet(m[2], dt);
      if (wait > 0) wait -= dt;
      else {
        const sub = dt / 3;
        for (let s = 0; s < 3; s++) {
          puck.x += puck.vx * sub;
          puck.y += puck.vy * sub;
          const inGoal = Math.abs(puck.x - W / 2) < GW / 2;
          if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.9; }
          if (puck.x > W - PR) { puck.x = W - PR; puck.vx = -Math.abs(puck.vx) * 0.9; }
          if (puck.y < PR && !inGoal) { puck.y = PR; puck.vy = Math.abs(puck.vy) * 0.9; }
          if (puck.y > H - PR && !inGoal) { puck.y = H - PR; puck.vy = -Math.abs(puck.vy) * 0.9; }
          if (puck.y < -PR) { goal(1); break; }
          if (puck.y > H + PR) { goal(2); break; }
          collide(m[1]);
          collide(m[2]);
        }
        const f = Math.pow(0.75, dt);
        puck.vx *= f; puck.vy *= f;
      }
      draw();
    });

    return () => {
      stop();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: min(100cqw, 100cqh * 9 / 16); aspect-ratio: 9 / 16; height: auto; }
</style>
