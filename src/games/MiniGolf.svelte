<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const R = 8, HR = 13, BX0 = 20, BX1 = 340, BY0 = 70, BY1 = 600, MAX = 8;
    const HOLES = [
      { par: 2, tee: [180, 560], hole: [180, 120], walls: [], sand: [], wp: [] },
      { par: 3, tee: [180, 560], hole: [180, 120], walls: [[130, 300, 100, 24]], sand: [], wp: [[80, 300]] },
      { par: 3, tee: [180, 560], hole: [80, 110], walls: [[20, 380, 200, 20], [140, 230, 200, 20]], sand: [], wp: [[280, 330], [80, 310]] },
      { par: 3, tee: [180, 560], hole: [180, 110], walls: [[60, 200, 90, 20], [210, 200, 90, 20]], sand: [[40, 300, 280, 120]], wp: [] },
      { par: 3, tee: [180, 560], hole: [180, 110], walls: [], sand: [], bar: { y: 320, w: 110, h: 18, amp: 120, sp: 1.3 }, wp: [] },
      { par: 3, tee: [180, 560], hole: [180, 110], walls: [[20, 220, 140, 200], [200, 220, 140, 200]], sand: [], wp: [] }
    ];
    const name = (p) => (p === 2 && mode === '1p' ? 'IA' : 'J' + p);

    let hi = 0, phase = 'aim', p = 1, t = 0;
    let balls, strokes, done, msg = '', msgT = 0, drag = null, aiTimer = null, nextTimer = null;
    const cur = () => HOLES[hi % HOLES.length];
    const flash = (s, d = 1.8) => { msg = s; msgT = d; };

    function barRect() {
      const b = cur().bar;
      if (!b) return null;
      const cx = 180 + b.amp * Math.sin(t * b.sp);
      return [cx - b.w / 2, b.y - b.h / 2, b.w, b.h];
    }

    function maybeAI() {
      if (mode === '1p' && p === 2 && phase === 'aim') aiTimer = setTimeout(aiShoot, 800);
    }

    function setup() {
      const h = cur();
      balls = {
        1: { x: h.tee[0] - 14, y: h.tee[1], vx: 0, vy: 0 },
        2: { x: h.tee[0] + 14, y: h.tee[1], vx: 0, vy: 0 }
      };
      strokes = { 1: 0, 2: 0 };
      done = { 1: false, 2: false };
      p = hi % 2 === 0 ? 1 : 2;
      phase = 'aim';
      flash(`Trou ${(hi % HOLES.length) + 1} · par ${h.par}`);
      maybeAI();
    }
    setup();

    function shoot(ang, speed) {
      const b = balls[p];
      b.vx = Math.cos(ang) * speed;
      b.vy = Math.sin(ang) * speed;
      strokes[p]++;
      sfx('hit');
      phase = 'roll';
    }

    function endHole() {
      phase = 'between';
      if (strokes[1] < strokes[2]) { flash(`${name(1)} gagne le trou`, 1.6); onpoint(1); }
      else if (strokes[2] < strokes[1]) { flash(`${name(2)} gagne le trou`, 1.6); onpoint(2); }
      else flash('Égalité', 1.6);
      nextTimer = setTimeout(() => { hi++; setup(); }, 1800);
    }

    function afterShot() {
      if (done[1] && done[2]) { endHole(); return; }
      const q = 3 - p;
      if (!done[q]) p = q;
      phase = 'aim';
      maybeAI();
    }

    function segFree(a, b) {
      const h = cur();
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(2, Math.ceil(d / 6));
      for (let i = 0; i <= n; i++) {
        const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n;
        for (const w of h.walls) {
          const cx = clamp(x, w[0], w[0] + w[2]), cy = clamp(y, w[1], w[1] + w[3]);
          if (Math.hypot(x - cx, y - cy) < R + 2) return false;
        }
      }
      return true;
    }

    function aiShoot() {
      if (phase !== 'aim' || p !== 2) return;
      const h = cur(), b = balls[2];
      const pts = [...h.wp, h.hole];
      let target = pts[0];
      for (let i = pts.length - 1; i >= 0; i--) {
        if (segFree([b.x, b.y], pts[i])) { target = pts[i]; break; }
      }
      const dx = target[0] - b.x, dy = target[1] - b.y;
      const d = Math.hypot(dx, dy);
      const speed = clamp(d * 1.65 * (0.94 + Math.random() * 0.14) + 40, 200, 900);
      shoot(Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.06, speed);
    }

    function down(e) {
      if (phase !== 'aim' || (mode === '1p' && p === 2)) return;
      cv.setPointerCapture(e.pointerId);
      const q = pos(e, cv);
      drag = { sx: q.x, sy: q.y, x: q.x, y: q.y };
    }
    function move(e) {
      if (!drag) return;
      const q = pos(e, cv);
      drag.x = q.x; drag.y = q.y;
    }
    function up() {
      if (!drag) return;
      const dx = drag.sx - drag.x, dy = drag.sy - drag.y;
      const len = Math.hypot(dx, dy);
      drag = null;
      if (len < 12) return;
      shoot(Math.atan2(dy, dx), (clamp(len, 0, 140) / 140) * 900 + 40);
    }
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    function bounceRect(b, r) {
      const [rx, ry, rw, rh] = r;
      const cx = clamp(b.x, rx, rx + rw), cy = clamp(b.y, ry, ry + rh);
      let dx = b.x - cx, dy = b.y - cy;
      let d = Math.hypot(dx, dy);
      if (d >= R) return;
      let nx, ny;
      if (d === 0) {
        const l = b.x - rx, rr = rx + rw - b.x, tp = b.y - ry, bt = ry + rh - b.y;
        const m = Math.min(l, rr, tp, bt);
        if (m === l) { nx = -1; ny = 0; b.x = rx - R; }
        else if (m === rr) { nx = 1; ny = 0; b.x = rx + rw + R; }
        else if (m === tp) { nx = 0; ny = -1; b.y = ry - R; }
        else { nx = 0; ny = 1; b.y = ry + rh + R; }
      } else {
        nx = dx / d; ny = dy / d;
        b.x = cx + nx * R; b.y = cy + ny * R;
      }
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; }
    }

    function update(dt) {
      t += dt;
      msgT = Math.max(0, msgT - dt);
      if (phase !== 'roll') return;
      const h = cur(), b = balls[p];
      let sunk = false;
      for (let s = 0; s < 4 && !sunk; s++) {
        const sub = dt / 4;
        b.x += b.vx * sub; b.y += b.vy * sub;
        if (b.x < BX0 + R) { b.x = BX0 + R; b.vx = Math.abs(b.vx) * 0.8; }
        else if (b.x > BX1 - R) { b.x = BX1 - R; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y < BY0 + R) { b.y = BY0 + R; b.vy = Math.abs(b.vy) * 0.8; }
        else if (b.y > BY1 - R) { b.y = BY1 - R; b.vy = -Math.abs(b.vy) * 0.8; }
        for (const w of h.walls) bounceRect(b, w);
        const br = barRect();
        if (br) bounceRect(b, br);
        if (Math.hypot(b.x - h.hole[0], b.y - h.hole[1]) < HR - 1 && Math.hypot(b.vx, b.vy) < 520) sunk = true;
      }
      if (sunk) {
        b.x = h.hole[0]; b.y = h.hole[1]; b.vx = b.vy = 0;
        sfx('hole');
        done[p] = true;
        flash(`${name(p)} : dans le trou en ${strokes[p]} !`, 1.4);
        afterShot();
        return;
      }
      const inSand = h.sand.some((r) => b.x > r[0] && b.x < r[0] + r[2] && b.y > r[1] && b.y < r[1] + r[3]);
      const f = Math.pow(inSand ? 0.02 : 0.2, dt);
      b.vx *= f; b.vy *= f;
      if (Math.hypot(b.vx, b.vy) < 8) {
        b.vx = b.vy = 0;
        if (strokes[p] >= MAX) { done[p] = true; flash(`${name(p)} : ${MAX} coups max`, 1.4); }
        afterShot();
      }
    }

    function draw() {
      const h = cur();
      ctx.fillStyle = '#4fc3ff'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 3;
      for (let y = 20; y < H; y += 36) for (let x = ((y / 36) % 2) * 30; x < W; x += 60) {
        ctx.beginPath(); ctx.arc(x + 15, y, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
      slab(ctx, BX0 - 10, BY0 - 10, BX1 - BX0 + 20, BY1 - BY0 + 20, 22, '#9a6330', { lw: 4, shadow: 6 });
      ctx.save();
      ctx.beginPath(); ctx.roundRect(BX0, BY0, BX1 - BX0, BY1 - BY0, 12); ctx.clip();
      ctx.fillStyle = '#8be04e'; ctx.fillRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
      ctx.fillStyle = '#7fd443';
      for (let y = BY0; y < BY1; y += 60) ctx.fillRect(BX0, y, BX1 - BX0, 30);
      ctx.restore();
      ink(ctx, 4); ctx.beginPath(); ctx.roundRect(BX0, BY0, BX1 - BX0, BY1 - BY0, 12); ctx.stroke();
      for (const r of h.sand) {
        slab(ctx, r[0], r[1], r[2], r[3], 14, '#ffe09a', { lw: 3, shadow: 0 });
        ctx.fillStyle = '#e2bd6b';
        for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(r[0] + 10 + ((i * 47) % (r[2] - 20)), r[1] + 10 + ((i * 29) % (r[3] - 20)), 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
      for (const w of h.walls) slab(ctx, w[0], w[1], w[2], w[3], 6, '#c77d3a', { lw: 3, shadow: 4 });
      const br = barRect();
      if (br) slab(ctx, br[0], br[1], br[2], br[3], 8, '#ff5a5f', { lw: 3, shadow: 4 });
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(h.tee[0], h.tee[1], 26, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      blob(ctx, h.hole[0], h.hole[1], HR, INK, { w: 0, shadow: 0, hl: false });
      ink(ctx, 5); ctx.beginPath(); ctx.moveTo(h.hole[0], h.hole[1]); ctx.lineTo(h.hole[0], h.hole[1] - 38); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.hole[0], h.hole[1]); ctx.lineTo(h.hole[0], h.hole[1] - 38); ctx.stroke();
      ctx.fillStyle = '#ff5a5f'; ink(ctx, 3);
      ctx.beginPath(); ctx.moveTo(h.hole[0], h.hole[1] - 38); ctx.lineTo(h.hole[0] + 20, h.hole[1] - 31); ctx.lineTo(h.hole[0], h.hole[1] - 24); ctx.closePath(); ctx.fill(); ctx.stroke();

      for (const q of [1, 2]) {
        if (done[q]) continue;
        const b = balls[q];
        if (phase === 'aim' && q === p) {
          ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(b.x, b.y, R + 6, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, R + 6, 0, Math.PI * 2); ctx.stroke();
        }
        blob(ctx, b.x, b.y, R, q === 1 ? C1 : C2, { w: 2.5, shadow: 2 });
      }

      if (drag && phase === 'aim') {
        const dx = drag.sx - drag.x, dy = drag.sy - drag.y;
        const len = Math.hypot(dx, dy);
        if (len > 4) {
          const b = balls[p];
          const L = 30 + clamp(len, 0, 140) * 1.4;
          ctx.lineWidth = 7; ctx.strokeStyle = INK;
          ctx.beginPath(); ctx.moveTo(b.x + (dx / len) * 14, b.y + (dy / len) * 14); ctx.lineTo(b.x + (dx / len) * L, b.y + (dy / len) * L); ctx.stroke();
          ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.setLineDash([8, 8]);
          ctx.beginPath(); ctx.moveTo(b.x + (dx / len) * 14, b.y + (dy / len) * 14); ctx.lineTo(b.x + (dx / len) * L, b.y + (dy / len) * L); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      shout(ctx, `Trou ${(hi % HOLES.length) + 1} · par ${h.par}`, W / 2, 32, 20);
      if (phase === 'aim') shout(ctx, `À ${name(p)} de jouer`, W / 2, 56, 14, p === 1 ? C1 : C2);
      shout(ctx, `J1 : ${strokes[1]} coup${strokes[1] > 1 ? 's' : ''}`, W * 0.27, 624, 15, C1);
      shout(ctx, `${name(2)} : ${strokes[2]} coup${strokes[2] > 1 ? 's' : ''}`, W * 0.73, 624, 15, C2);
      if (msgT > 0) banner(ctx, msg, 318);
    }

    const stop = startLoop((dt) => { update(dt); draw(); });

    return () => {
      stop();
      clearTimeout(aiTimer);
      clearTimeout(nextTimer);
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: 100%; height: 100%; }
</style>
