<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const BX0 = 10, BX1 = 350, BY0 = 150, BY1 = 490, CR = 10, SR = 13, PKR = 19;
    const CX = (BX0 + BX1) / 2, CY = (BY0 + BY1) / 2;
    const pockets = [[BX0 + 8, BY0 + 8], [BX1 - 8, BY0 + 8], [BX0 + 8, BY1 - 8], [BX1 - 8, BY1 - 8]];
    const BASE = { 1: BY1 - 40, 2: BY0 + 40 };
    const own = (p) => (p === 1 ? 'W' : 'B');
    const name = (p) => (p === 2 && mode === '1p' ? 'IA' : 'J' + p);

    let coins = [], striker, turn = 1, phase = 'place', over = false;
    let queenState = 'board', pendingOwner = 0, pocketedNow = [];
    let drag = null, sliding = false, msg = '', msgT = 0, aiTimer = null;

    function setupCoins() {
      coins = [{ t: 'Q', x: CX, y: CY, vx: 0, vy: 0, r: CR, m: 1, out: false }];
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        coins.push({ t: k % 2 ? 'W' : 'B', x: CX + 22 * Math.cos(a), y: CY + 22 * Math.sin(a), vx: 0, vy: 0, r: CR, m: 1, out: false });
      }
      for (let k = 0; k < 12; k++) {
        const a = (Math.PI / 12) + (k * Math.PI) / 6;
        coins.push({ t: k % 2 ? 'W' : 'B', x: CX + 42 * Math.cos(a), y: CY + 42 * Math.sin(a), vx: 0, vy: 0, r: CR, m: 1, out: false });
      }
      striker = { t: 'S', x: CX, y: BASE[1], vx: 0, vy: 0, r: SR, m: 2.2, out: false };
    }
    setupCoins();

    const remaining = (t) => coins.filter((c) => !c.out && c.t === t).length;
    const flash = (s) => { msg = s; msgT = 1.8; };

    function findFree() {
      for (const rad of [0, 24, 48, 72]) {
        for (let a = 0; a < 360; a += 30) {
          const x = CX + rad * Math.cos((a * Math.PI) / 180), y = CY + rad * Math.sin((a * Math.PI) / 180);
          if (!coins.some((c) => !c.out && Math.hypot(c.x - x, c.y - y) < 2 * CR + 1)) return [x, y];
          if (rad === 0) break;
        }
      }
      return [CX, CY];
    }
    function putBack(c) {
      const [x, y] = findFree();
      c.out = false; c.x = x; c.y = y; c.vx = c.vy = 0;
    }
    function returnQueen() {
      const q = coins.find((c) => c.t === 'Q');
      putBack(q);
      queenState = 'board';
    }

    function placeStriker() {
      striker.out = false; striker.vx = striker.vy = 0;
      striker.x = CX; striker.y = BASE[turn];
    }

    function startTurn() {
      phase = 'place';
      placeStriker();
      if (mode === '1p' && turn === 2) aiTimer = setTimeout(aiShoot, 900);
    }

    function shoot(ang, speed) {
      striker.vx = Math.cos(ang) * speed;
      striker.vy = Math.sin(ang) * speed;
      pocketedNow = [];
      phase = 'moving';
      sfx('hit');
    }

    function win(p) {
      over = true; phase = 'over';
      flash(`${name(p)} gagne !`);
      onpoint(p);
    }

    function endShot() {
      const p = turn, ownT = own(p), oppT = own(3 - p);
      const ownIn = pocketedNow.filter((t) => t === ownT).length;
      const queenIn = pocketedNow.includes('Q');
      let again = false;
      if (striker.out) {
        const back = coins.filter((c) => c.out && c.t === ownT);
        if (back.length) putBack(back[back.length - 1]);
        if (queenIn || queenState === 'pending') returnQueen();
        flash('Faute ! Une pièce revient');
      } else {
        if (queenState === 'pending') {
          if (ownIn > 0) { queenState = 'captured'; flash('Reine couverte !'); }
          else { returnQueen(); flash('Reine non couverte'); }
        }
        if (queenIn) {
          if (ownIn > 0) { queenState = 'captured'; flash('Reine et pièce !'); }
          else { queenState = 'pending'; pendingOwner = p; flash('Couvre la reine !'); }
        }
        again = ownIn > 0 || queenState === 'pending';
      }
      for (const [t, who] of [[ownT, p], [oppT, 3 - p]]) {
        if (remaining(t) === 0) {
          if (queenState === 'captured') { win(who); return; }
          const back = coins.filter((c) => c.out && c.t === t);
          if (back.length) putBack(back[back.length - 1]);
          flash("D'abord la reine !");
          if (who === p) again = false;
        }
      }
      if (!again) turn = 3 - p;
      startTurn();
    }

    function aiShoot() {
      if (over || turn !== 2 || phase !== 'place') return;
      const targets = coins.filter((c) => !c.out && (c.t === 'B' || (c.t === 'Q' && queenState === 'board')));
      let best = null;
      for (let x = 70; x <= 290; x += 20) {
        const sy = BASE[2];
        if (coins.some((c) => !c.out && Math.hypot(c.x - x, c.y - sy) < SR + CR + 2)) continue;
        for (const c of targets) {
          for (const pk of pockets) {
            const ux = pk[0] - c.x, uy = pk[1] - c.y;
            const d2 = Math.hypot(ux, uy) || 1;
            const nx = ux / d2, ny = uy / d2;
            const gx = c.x - nx * (CR + SR), gy = c.y - ny * (CR + SR);
            const vx = gx - x, vy = gy - sy;
            const d1 = Math.hypot(vx, vy) || 1;
            const dot = (vx / d1) * nx + (vy / d1) * ny;
            if (dot < 0.4 || vy < 0.2 * d1) continue;
            const cost = d1 + d2 * 1.2 + (1 - dot) * 220;
            if (!best || cost < best.cost) best = { cost, x, ang: Math.atan2(vy, vx), speed: (d1 + d2) * 3.2 + 150 };
          }
        }
      }
      if (!best) {
        const c = targets[0] || coins.find((k) => !k.out);
        best = { x: CX, ang: Math.atan2(c.y - BASE[2], c.x - CX), speed: 900 };
      }
      striker.x = best.x;
      shoot(best.ang + (Math.random() - 0.5) * 0.08, clamp(best.speed, 400, 1500));
    }

    const canAct = () => phase === 'place' && !over && !(mode === '1p' && turn === 2);
    const inSlider = (q) => (turn === 1 ? q.y > BY1 + 6 : q.y < BY0 - 6);

    function down(e) {
      if (!canAct()) return;
      cv.setPointerCapture(e.pointerId);
      const q = pos(e, cv);
      if (inSlider(q)) { sliding = true; striker.x = clamp(q.x, 70, 290); }
      else drag = { sx: q.x, sy: q.y, x: q.x, y: q.y };
    }
    function move(e) {
      const q = pos(e, cv);
      if (sliding) striker.x = clamp(q.x, 70, 290);
      else if (drag) { drag.x = q.x; drag.y = q.y; }
    }
    function up() {
      sliding = false;
      if (!drag) return;
      const dx = drag.sx - drag.x, dy = drag.sy - drag.y;
      const len = Math.hypot(dx, dy);
      drag = null;
      if (len < 14 || !canAct()) return;
      shoot(Math.atan2(dy, dx), 200 + (clamp(len, 0, 150) / 150) * 1400);
    }
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    function collide(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d < min && d > 0) {
        const nx = dx / d, ny = dy / d, tm = a.m + b.m, ov = min - d;
        a.x -= nx * ov * (b.m / tm); a.y -= ny * ov * (b.m / tm);
        b.x += nx * ov * (a.m / tm); b.y += ny * ov * (a.m / tm);
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const j = (-(1.9) * vn) / (1 / a.m + 1 / b.m);
          a.vx -= (j * nx) / a.m; a.vy -= (j * ny) / a.m;
          b.vx += (j * nx) / b.m; b.vy += (j * ny) / b.m;
          if (vn < -60) sfx('clack');
        }
      }
    }

    function physics(sub) {
      const discs = [striker, ...coins].filter((d) => !d.out);
      for (const d of discs) {
        d.x += d.vx * sub; d.y += d.vy * sub;
        for (const pk of pockets) {
          if (Math.hypot(d.x - pk[0], d.y - pk[1]) < PKR) {
            d.out = true; d.vx = d.vy = 0;
            pocketedNow.push(d.t);
            sfx('pocket');
            break;
          }
        }
        if (d.out) continue;
        if (d.x < BX0 + d.r) { d.x = BX0 + d.r; d.vx = Math.abs(d.vx) * 0.75; }
        else if (d.x > BX1 - d.r) { d.x = BX1 - d.r; d.vx = -Math.abs(d.vx) * 0.75; }
        if (d.y < BY0 + d.r) { d.y = BY0 + d.r; d.vy = Math.abs(d.vy) * 0.75; }
        else if (d.y > BY1 - d.r) { d.y = BY1 - d.r; d.vy = -Math.abs(d.vy) * 0.75; }
      }
      const live = discs.filter((d) => !d.out);
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) collide(live[i], live[j]);
    }

    function coin(d) {
      if (d.t === 'W') { blob(ctx, d.x, d.y, d.r, '#fff7e0', { w: 2.5, shadow: 2 }); }
      else if (d.t === 'B') { blob(ctx, d.x, d.y, d.r, '#3b2a4a', { w: 2.5, shadow: 2 }); }
      else { blob(ctx, d.x, d.y, d.r, '#ff4d6d', { w: 2.5, shadow: 2 }); }
      ink(ctx, 1.4); ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 0.55, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }

    function draw(dt) {
      msgT = Math.max(0, msgT - dt);
      dots(ctx, '#ffd166');
      slab(ctx, BX0 - 12, BY0 - 12, BX1 - BX0 + 24, BY1 - BY0 + 24, 20, '#b4642a', { lw: 4, shadow: 6 });
      slab(ctx, BX0, BY0, BX1 - BX0, BY1 - BY0, 8, '#f8d08a', { lw: 3, shadow: 0 });
      ctx.strokeStyle = '#d98b3a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CX, CY, 48, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(CX, CY, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 3;
      for (const p of [1, 2]) {
        ctx.beginPath(); ctx.moveTo(BX0 + 40, BASE[p]); ctx.lineTo(BX1 - 40, BASE[p]); ctx.stroke();
        for (const x of [BX0 + 40, BX1 - 40]) { ctx.beginPath(); ctx.arc(x, BASE[p], 6, 0, Math.PI * 2); ctx.stroke(); }
      }
      for (const pk of pockets) blob(ctx, pk[0], pk[1], PKR, INK, { w: 0, shadow: 0, hl: false });
      for (const c of coins) if (!c.out) coin(c);
      if (!striker.out) blob(ctx, striker.x, striker.y, striker.r, turn === 1 ? C1 : C2, { w: 3, shadow: 3 });

      if (phase === 'place' && !over) {
        const y = turn === 1 ? 548 : 98;
        slab(ctx, 62, y - 11, 236, 22, 11, '#fff', { lw: 3, shadow: 3 });
        blob(ctx, striker.x, y, 14, turn === 1 ? C1 : C2, { w: 3, shadow: 2 });
        if (!(mode === '1p' && turn === 2)) {
          shout(ctx, 'Glisse pour placer, tire en arrière', W / 2, turn === 1 ? 582 : 128, 12);
        }
      }
      if (drag && phase === 'place') {
        const dx = drag.sx - drag.x, dy = drag.sy - drag.y, len = Math.hypot(dx, dy);
        if (len > 4) {
          const L = 50 + clamp(len, 0, 150) * 1.5, ux = dx / len, uy = dy / len;
          ctx.lineWidth = 7; ctx.strokeStyle = INK;
          ctx.beginPath(); ctx.moveTo(striker.x + ux * 16, striker.y + uy * 16); ctx.lineTo(striker.x + ux * L, striker.y + uy * L); ctx.stroke();
          ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff'; ctx.setLineDash([8, 8]);
          ctx.beginPath(); ctx.moveTo(striker.x + ux * 16, striker.y + uy * 16); ctx.lineTo(striker.x + ux * L, striker.y + uy * L); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      shout(ctx, `${name(2)} (noires) : ${remaining('B')}`, W / 2, 28, 15, C2);
      shout(ctx, `J1 (blanches) : ${remaining('W')}`, W / 2, 616, 15, C1);
      if (msgT > 0) banner(ctx, msg, 320);
    }

    startTurn();
    const stop = startLoop((dt) => {
      if (phase === 'moving') {
        for (let s = 0; s < 4; s++) physics(dt / 4);
        const f = Math.pow(0.2, dt);
        let moving = false;
        for (const d of [striker, ...coins]) {
          if (d.out) continue;
          d.vx *= f; d.vy *= f;
          if (Math.hypot(d.vx, d.vy) < 8) d.vx = d.vy = 0; else moving = true;
        }
        if (!moving) endShot();
      }
      draw(dt);
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
  canvas { width: min(100cqw, 100cqh * 9 / 16); aspect-ratio: 9 / 16; height: auto; }
</style>
