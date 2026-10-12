<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const R = 10, X0 = 30, X1 = 330, Y0 = 60, Y1 = 580, PR = 19, YM = (Y0 + Y1) / 2;
    const pockets = [[X0, Y0], [X1, Y0], [X0, YM], [X1, YM], [X0, Y1], [X1, Y1]];
        const colorOf = (id) => (id === 0 ? '#fff' : id === 8 ? '#111' : id < 8 ? '#3b82f6' : '#ef4444');
    const groupOf = (id) => (id < 8 ? 'solid' : 'stripe');
    const gname = (g) => (g === 'solid' ? 'bleues' : 'rouges');
    const name = (p) => (p === 2 && mode === '1p' ? 'IA' : 'J' + p);

    let balls = [], turn = 1, phase = 'aim', pocketed = [], onEight = false;
    let groups = { 1: 'solid', 2: 'stripe' };
    let msg = '', msgT = 0, drag = null, aiTimer = null, over = false;

    function rack() {
      const ids = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      balls = [{ id: 0, x: 180, y: 450, vx: 0, vy: 0, out: false }];
      let k = 0;
      for (let r = 0; r < 5; r++) {
        for (let i = 0; i <= r; i++) {
          const id = r === 2 && i === 1 ? 8 : ids[k++];
          balls.push({
            id,
            x: 180 + (i - r / 2) * (2 * R + 0.6),
            y: 250 - r * (2 * R * 0.866 + 0.6),
            vx: 0, vy: 0, out: false
          });
        }
      }
    }
    rack();

    const cue = () => balls[0];
    const remaining = (g) =>
      balls.filter((b) => !b.out && b.id > 0 && b.id !== 8 && groupOf(b.id) === g).length;
    const flash = (t) => { msg = t; msgT = 1.8; };

    function shoot(ang, speed) {
      const c = cue();
      c.vx = Math.cos(ang) * speed;
      c.vy = Math.sin(ang) * speed;
      pocketed = [];
      onEight = groups[turn] !== null && remaining(groups[turn]) === 0;
      phase = 'moving';
      sfx('hit');
    }

    function finish(w) {
      over = true;
      phase = 'over';
      flash(`${name(w)} gagne !`);
      onpoint(w);
    }

    function endShot() {
      const t = turn;
      const scratch = pocketed.includes(0);
      const c = cue();
      const others = pocketed.filter((id) => id > 0);
      if (scratch) {
        c.out = false; c.vx = c.vy = 0; c.x = 180; c.y = 450;
        while (balls.some((b) => b !== c && !b.out && Math.hypot(b.x - c.x, b.y - c.y) < 2 * R + 1)) c.y -= 2 * R + 2;
      }
      if (others.includes(8)) {
        finish(onEight && !scratch ? t : 3 - t);
        return;
      }
      if (groups[t] === null && others.length) {
        const g = groupOf(others[0]);
        groups[t] = g;
        groups[3 - t] = g === 'solid' ? 'stripe' : 'solid';
        flash(`${name(t)} : ${gname(g)}`);
      }
      const own = others.some((id) => groupOf(id) === groups[t]);
      if (scratch) flash('Faute ! Bille blanche replacée');
      if (!(own && !scratch)) turn = 3 - t;
      phase = 'aim';
      if (mode === '1p' && turn === 2) aiTimer = setTimeout(aiShoot, 900);
    }

    function aiShoot() {
      if (over) return;
      const c = cue();
      const g = groups[2];
      let cands = balls.filter((b) => {
        if (b.out || b.id === 0) return false;
        if (!g) return b.id !== 8;
        return remaining(g) === 0 ? b.id === 8 : b.id !== 8 && groupOf(b.id) === g;
      });
      if (!cands.length) cands = balls.filter((b) => !b.out && b.id > 0);
      let best = null;
      for (const b of cands) {
        for (const p of pockets) {
          const ux = p[0] - b.x, uy = p[1] - b.y;
          const d2 = Math.hypot(ux, uy) || 1;
          const nx = ux / d2, ny = uy / d2;
          const gx = b.x - nx * 2 * R, gy = b.y - ny * 2 * R;
          const vx = gx - c.x, vy = gy - c.y;
          const d1 = Math.hypot(vx, vy) || 1;
          const dot = (vx / d1) * nx + (vy / d1) * ny;
          if (dot < 0.35) continue;
          const cost = d1 + d2 * 1.2 + (1 - dot) * 200;
          if (!best || cost < best.cost) best = { cost, ang: Math.atan2(vy, vx), speed: (d1 + d2) * 2.6 + 120 };
        }
      }
      if (!best) {
        const b = cands.reduce((a, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? x : a), cands[0]);
        best = { ang: Math.atan2(b.y - c.y, b.x - c.x), speed: 700 };
      }
      shoot(best.ang + (Math.random() - 0.5) * 0.06, clamp(best.speed, 300, 1400));
    }

    function down(e) {
      if (phase !== 'aim' || over || (mode === '1p' && turn === 2)) return;
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
      if (len < 14) return;
      shoot(Math.atan2(dy, dx), 150 + (clamp(len, 0, 140) / 140) * 1250);
    }
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    function physics(sub) {
      for (const b of balls) {
        if (b.out) continue;
        b.x += b.vx * sub;
        b.y += b.vy * sub;
        for (const p of pockets) {
          if (Math.hypot(b.x - p[0], b.y - p[1]) < PR) {
            b.out = true; b.vx = b.vy = 0;
            pocketed.push(b.id);
            sfx('pocket');
            break;
          }
        }
        if (b.out) continue;
        if (b.x < X0 + R) { b.x = X0 + R; b.vx = Math.abs(b.vx) * 0.8; }
        else if (b.x > X1 - R) { b.x = X1 - R; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y < Y0 + R) { b.y = Y0 + R; b.vy = Math.abs(b.vy) * 0.8; }
        else if (b.y > Y1 - R) { b.y = Y1 - R; b.vy = -Math.abs(b.vy) * 0.8; }
      }
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (a.out) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (b.out) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d < 2 * R && d > 0) {
            const nx = dx / d, ny = dy / d;
            const push = (2 * R - d) / 2;
            a.x -= nx * push; a.y -= ny * push;
            b.x += nx * push; b.y += ny * push;
            const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vn < 0) {
              a.vx += vn * nx; a.vy += vn * ny;
              b.vx -= vn * nx; b.vy -= vn * ny;
              if (vn < -40) sfx('clack');
            }
          }
        }
      }
    }

    function drawBall(b) {
      blob(ctx, b.x, b.y, R, colorOf(b.id), { w: 2.5, shadow: 3 });
      if (b.id === 8) {
        blob(ctx, b.x, b.y, 4.4, '#fff', { w: 1.5, shadow: 0, hl: false });
        ctx.fillStyle = INK; ctx.font = `700 8px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('8', b.x, b.y + 0.5);
      }
    }

    function draw() {
      dots(ctx, '#ffd166');
      slab(ctx, X0 - 20, Y0 - 20, X1 - X0 + 40, Y1 - Y0 + 40, 26, '#b4642a', { lw: 4, shadow: 6 });
      slab(ctx, X0 - 8, Y0 - 8, X1 - X0 + 16, Y1 - Y0 + 16, 12, '#2fbf71', { lw: 4, shadow: 0 });
      ctx.fillStyle = 'rgba(0,0,0,.07)';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(60 + ((i * 83) % 250), 90 + ((i * 131) % 460), 16, 0, Math.PI * 2); ctx.fill(); }
      for (const p of pockets) blob(ctx, p[0], p[1], PR - 2, INK, { w: 0, shadow: 0, hl: false });
      for (const b of balls) if (!b.out) drawBall(b);

      if (drag && phase === 'aim') {
        const dx = drag.sx - drag.x, dy = drag.sy - drag.y;
        const len = Math.hypot(dx, dy);
        if (len > 4) {
          const ux = dx / len, uy = dy / len, c = cue();
          const L = 50 + clamp(len, 0, 140) * 2;
          ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(c.x + ux * 14, c.y + uy * 14); ctx.lineTo(c.x + ux * L, c.y + uy * L); ctx.stroke();
          ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.setLineDash([8, 8]);
          ctx.beginPath(); ctx.moveTo(c.x + ux * 14, c.y + uy * 14); ctx.lineTo(c.x + ux * L, c.y + uy * L); ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      const gtxt = groups[turn] ? gname(groups[turn]) : 'table ouverte';
      shout(ctx, `Tour de ${name(turn)} · ${gtxt}`, W / 2, 28, 17, turn === 1 ? C1 : C2);
      if (groups[1]) {
        shout(ctx, `J1 ${gname(groups[1])} : ${remaining(groups[1])}`, W * 0.27, 616, 14, C1);
        shout(ctx, `${name(2)} ${gname(groups[2])} : ${remaining(groups[2])}`, W * 0.73, 616, 14, C2);
      }
      if (msgT > 0) banner(ctx, msg, 318);
    }

    const stop = startLoop((dt) => {
      msgT = Math.max(0, msgT - dt);
      if (phase === 'moving') {
        for (let s = 0; s < 4; s++) physics(dt / 4);
        const f = Math.pow(0.12, dt);
        let moving = false;
        for (const b of balls) {
          if (b.out) continue;
          b.vx *= f; b.vy *= f;
          if (Math.hypot(b.vx, b.vy) < 10) b.vx = b.vy = 0;
          else moving = true;
        }
        if (!moving) endShot();
      }
      draw();
    });

    return () => {
      stop();
      clearTimeout(aiTimer);
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
