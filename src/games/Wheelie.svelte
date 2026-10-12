<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const LEN = 600, BX = 110, LH = 280;
    const LANE = {
      2: { y0: 20, sky: ['#3b0764', '#f97316'], far: '#5b1a63', near: '#7c2d6b', color: C2, helmet: '#fca5a5' },
      1: { y0: 340, sky: ['#1e1b4b', '#38bdf8'], far: '#26357a', near: '#2f5aa8', color: C1, helmet: '#bfdbfe' }
    };
    const GROUND = 200;
    const name = (p) => (p === 2 && mode === '1p' ? 'IA' : 'J' + p);
    const mk = () => ({ prog: 0, th: 0, om: 0, v: 0, crash: 0, rot: 0, ptrs: new Set(), parts: [] });
    let pl = { 1: mk(), 2: mk() };
    let over = 0, wait = 1.8, msg = '', msgT = 0, aiHold = false, aiT = 0, aiTarget = 36, clock = 0;

    function reset() { pl = { 1: mk(), 2: mk() }; over = 0; wait = 1.8; }
    const flash = (t) => { msg = t; msgT = 1.6; };

    const owner = new Map();
    function down(e) {
      cv.setPointerCapture(e.pointerId);
      const q = pos(e, cv);
      const p = mode === '1p' || q.y > H / 2 ? 1 : 2;
      owner.set(e.pointerId, p);
      pl[p].ptrs.add(e.pointerId);
    }
    function up(e) {
      const p = owner.get(e.pointerId);
      if (p) pl[p].ptrs.delete(e.pointerId);
      owner.delete(e.pointerId);
    }
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    function update(dt) {
      clock += dt;
      msgT = Math.max(0, msgT - dt);
      for (const p of [1, 2]) {
        const s = pl[p];
        s.parts = s.parts.filter((q) => (q.life -= dt) > 0);
        for (const q of s.parts) { q.x += q.vx * dt; q.y += q.vy * dt; }
      }
      if (over > 0) { over -= dt; if (over <= 0) reset(); return; }
      if (wait > 0) { wait -= dt; return; }
      if (mode === '1p') {
        aiT -= dt;
        if (aiT <= 0) {
          aiT = 0.07;
          aiHold = pl[2].th < aiTarget;
          if (Math.random() < 0.05) aiHold = !aiHold;
          if (Math.random() < 0.02) aiTarget = 30 + Math.random() * 16;
        }
      }
      for (const p of [1, 2]) {
        const s = pl[p];
        if (s.crash > 0) {
          s.crash -= dt; s.v = 0;
          if (s.crash <= 0) { s.th = 0; s.om = 0; }
          continue;
        }
        const hold = s.ptrs.size > 0 || (mode === '1p' && p === 2 && aiHold);
        s.v = Math.max(0, Math.min(70, s.v + (hold ? 55 : -30) * dt));
        s.om += ((hold ? 150 : -130) - 70 * (s.th / 90)) * dt;
        s.om *= Math.pow(0.6, dt);
        s.th += s.om * dt;
        if (s.th < 0) { s.th = 0; s.om = 0; }
        if (s.th > 80) {
          s.crash = 1.3; s.v = 0; s.om = 0; sfx('crash'); s.prog = Math.max(0, s.prog - 40);
          for (let i = 0; i < 14; i++) s.parts.push({ x: BX + 20, y: GROUND - 20, vx: (Math.random() - 0.3) * 160, vy: -Math.random() * 180, life: 0.7, r: 3, c: '#fde68a' });
        }
        const mult = s.th >= 20 && s.th <= 60 ? 1.8 : 1;
        s.prog += s.v * dt * mult;
        s.rot += s.v * dt * 0.25 * mult;
        if (s.v > 8 && Math.random() < 0.6) {
          s.parts.push({ x: BX - 14, y: GROUND - 3, vx: -60 - s.v, vy: -10 - Math.random() * 25, life: 0.5, r: 2 + Math.random() * 2, c: 'rgba(230,220,200,.5)' });
        }
        if (hold && s.th < 30 && Math.random() < 0.7) {
          s.parts.push({ x: BX - 20, y: GROUND - 18, vx: -90 - Math.random() * 40, vy: (Math.random() - 0.5) * 30, life: 0.25, r: 3, c: '#fb923c' });
        }
        if (s.prog >= LEN && over <= 0) {
          over = 1.8;
          flash(`${name(p)} gagne la course`);
          onpoint(p);
          return;
        }
      }
    }

    function pt(th, fx, fu) {
      const a = (th * Math.PI) / 180;
      return [BX + fx * Math.cos(a) - fu * Math.sin(a), GROUND - 14 - fx * Math.sin(a) - fu * Math.cos(a)];
    }
    function poly(points, fill) {
      ctx.fillStyle = fill; ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath(); ctx.fill();
    }
    function seg(a, b, w, col) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    function wheel(c, rot) {
      ctx.fillStyle = '#111827';
      ctx.beginPath(); ctx.arc(c[0], c[1], 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c[0], c[1], 9, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = rot + (i * Math.PI) / 3;
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.cos(a) * 9, c[1] + Math.sin(a) * 9); ctx.stroke();
      }
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.arc(c[0], c[1], 2.5, 0, Math.PI * 2); ctx.fill();
    }

    function bike(s, L, th) {
      const rear = pt(th, 0, 0), front = pt(th, 46, 0);
      wheel(rear, s.rot); wheel(front, s.rot);
      seg(pt(th, 44, 0), pt(th, 38, 26), 4, '#cbd5e1');
      poly([pt(th, 2, 8), pt(th, 4, 18), pt(th, 20, 19), pt(th, 34, 23), pt(th, 38, 15), pt(th, 24, 6), pt(th, 14, 2)], L.color);
      poly([pt(th, 14, 2), pt(th, 29, 2), pt(th, 27, 12), pt(th, 16, 12)], '#1f2937');
      seg(pt(th, 2, 19), pt(th, 21, 20), 4, '#0b0b12');
      seg(pt(th, 36, 27), pt(th, 32, 34), 3, '#e5e7eb');
      seg(pt(th, 12, 20), pt(th, 24, 12), 6, '#1f2937');
      seg(pt(th, 24, 12), pt(th, 19, 4), 5, '#1f2937');
      seg(pt(th, 12, 20), pt(th, 14, 40), 8, L.color);
      seg(pt(th, 14, 38), pt(th, 33, 32), 4, '#e5e7eb');
      const h = pt(th, 16, 48);
      ctx.fillStyle = L.helmet; ctx.beginPath(); ctx.arc(h[0], h[1], 8, 0, Math.PI * 2); ctx.fill();
      const v = pt(th, 21, 49);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(v[0], v[1], 4, 0, Math.PI * 2); ctx.fill();
    }

    function ridge(L, off, base, amp, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, LH);
      for (let x = 0; x <= W; x += 6) {
        const o = x + off;
        ctx.lineTo(x, base - amp * (0.6 + 0.4 * Math.sin(o * 0.021) + 0.25 * Math.sin(o * 0.057 + 1)));
      }
      ctx.lineTo(W, LH); ctx.closePath(); ctx.fill();
    }

    function lane(p) {
      const s = pl[p], L = LANE[p];
      ctx.save();
      ctx.translate(10, L.y0);
      ctx.beginPath(); ctx.roundRect(0, 0, W - 20, LH, 18); ctx.clip();
      ctx.translate(-10, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, L.sky[0]); sky.addColorStop(1, L.sky[1]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, LH);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.beginPath(); ctx.arc(280, 60, 22, 0, Math.PI * 2); ctx.fill();
      ridge(L, s.prog * 0.3, 150, 95, L.far);
      ridge(L, s.prog * 0.8, 195, 55, L.near);
      ctx.fillStyle = '#23233a'; ctx.fillRect(0, GROUND, W, LH - GROUND);
      ctx.fillStyle = '#34344f'; ctx.fillRect(0, GROUND, W, 5);
      ctx.fillStyle = '#e5e7eb';
      const off = (s.prog * 1.8) % 60;
      for (let x = -60; x < W + 60; x += 60) ctx.fillRect(x - off, GROUND + 48, 30, 4);

      const fx = BX + (LEN - s.prog) * 1.0;
      if (fx < W + 20) {
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = i % 2 ? '#fff' : '#111';
          ctx.fillRect(fx, GROUND - 120 + i * 12, 8, 12);
          ctx.fillStyle = (i + 1) % 2 ? '#fff' : '#111';
          ctx.fillRect(fx + 8, GROUND - 120 + i * 12, 8, 12);
        }
        ctx.fillStyle = '#e5e7eb'; ctx.fillRect(fx - 2, GROUND - 130, 3, 130);
      }

      if (s.v > 35) {
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const y = 60 + ((i * 53 + clock * 400) % 130), x = (W - ((clock * 900 + i * 97) % W));
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(BX + 22, GROUND + 2, 40, 5, 0, 0, Math.PI * 2); ctx.fill();
      for (const q of s.parts) {
        ctx.fillStyle = q.c; ctx.globalAlpha = Math.min(1, q.life * 3);
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      bike(s, L, s.crash > 0 ? 112 : s.th);

      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(40, 16, W - 80, 6);
      ctx.fillStyle = L.color; ctx.fillRect(40, 16, (W - 80) * Math.min(1, s.prog / LEN), 6);
      shout(ctx, name(p), 28, 38, 16);
      ctx.restore();
      ctx.save(); ctx.translate(10, L.y0); ink(ctx, 5);
      ctx.beginPath(); ctx.roundRect(0, 0, W - 20, LH, 18); ctx.stroke(); ctx.restore();
    }

    function draw() {
      dots(ctx, '#ffd166');
      lane(2); lane(1);
      if (wait > 0) {
        const n = Math.ceil(wait / 0.6);
        shout(ctx, n > 2 ? '3' : n === 2 ? '2' : '1', W / 2, H / 2, 72);
      }
      if (msgT > 0) banner(ctx, msg, H / 2);
    }

    const stop = startLoop((dt) => { update(dt); draw(); });
    return () => {
      stop();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: min(100cqw, 100cqh * 9 / 16); aspect-ratio: 9 / 16; height: auto; }
</style>
