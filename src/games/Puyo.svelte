<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, slab, shout, blob, dots } from '../lib/canvas.js';
  import {
    COLS, ROWS, GARBAGE, SCORE_PER_GARBAGE,
    makeGrid, randomPair, spawn, satellite, shift, rotate, fall, lock, gravity,
    findGroups, clearGroups, chainScore, dropGarbage, spawnBlocked, bestPlacements
  } from '../lib/puyo.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const S = 26; // taille d'une case
    const BY = 66; // haut des grilles
    const BX = { 1: 6, 2: 198 };
    const COL = ['', '#ff5a5f', '#4cd964', '#4f9dff', '#ffd23f', '#c9ccd6'];
    const isAI = (p) => mode === '1p' && p === 2;
    const players = mode === '1p' ? [1] : [1, 2];

    let seq = []; // même suite de paires pour les deux joueurs
    let pl;
    let over = false;
    let alive = true;
    let wait = 0;
    let clock = 0;
    const holds = new Map(); // pointeur ou touche -> { p, a, t }

    const pairAt = (i) => {
      while (seq.length <= i) seq.push(randomPair());
      return seq[i];
    };

    const newPlayer = (p) => ({
      p, grid: makeGrid(), piece: null, idx: 0, t: 0, iv: 0.8, elapsed: 0,
      soft: false, softLock: false, aiSoft: false, ai: null,
      phase: 'fall', step: 'check', timer: 0, chain: 0, groups: null, flash: [],
      atk: 0, carry: 0, pending: 0, popText: '', popT: 0
    });

    function planAI(q) {
      const c = bestPlacements(q.grid, pairAt(q.idx - 1));
      const pick = Math.random() < 0.2 && c.length > 1 ? c[1 + Math.floor(Math.random() * Math.min(2, c.length - 1))] : c[0];
      q.ai = { x: pick ? pick.x : 2, rot: pick ? pick.rot : 0, t: 0.35 + Math.random() * 0.3 };
    }

    function spawnNext(q) {
      if (spawnBlocked(q.grid)) {
        q.phase = 'dead';
        q.piece = null;
        return;
      }
      q.piece = spawn(pairAt(q.idx++));
      q.t = 0;
      q.softLock = true;
      q.aiSoft = false;
      if (isAI(q.p)) planAI(q);
    }

    function fresh() {
      seq = [];
      pl = { 1: newPlayer(1), 2: newPlayer(2) };
      over = false;
      wait = 0.9;
      spawnNext(pl[1]);
      spawnNext(pl[2]);
    }
    fresh();

    function act(p, a) {
      const q = pl[p];
      if (over || wait > 0 || q.phase !== 'fall' || !q.piece) return;
      if (a === 'left') q.piece = shift(q.grid, q.piece, -1);
      else if (a === 'right') q.piece = shift(q.grid, q.piece, 1);
      else if (a === 'rot') {
        q.piece = rotate(q.grid, q.piece, 1);
        sfx('tick');
      }
    }

    function land(q) {
      lock(q.grid, q.piece);
      q.piece = null;
      q.phase = 'resolve';
      q.step = 'check';
      q.timer = 0.05;
      q.chain = 0;
      q.atk = 0;
      sfx('bump');
    }

    function finish(q, o) {
      // les déchets reçus sont d'abord compensés par l'attaque, le reste part chez l'adversaire
      let atk = q.atk;
      q.atk = 0;
      const off = Math.min(atk, q.pending);
      q.pending -= off;
      atk -= off;
      if (atk > 0) {
        o.pending += atk;
        sfx('whoosh');
      }
      if (q.pending > 0) {
        const n = Math.min(q.pending, 30);
        q.pending -= n;
        dropGarbage(q.grid, n);
        sfx('hit');
      }
      q.phase = 'fall';
      spawnNext(q);
    }

    function stepResolve(q, o) {
      if (q.step === 'pop') {
        clearGroups(q.grid, q.groups);
        const total = q.carry + chainScore(q.chain, q.groups) / SCORE_PER_GARBAGE;
        q.atk += Math.floor(total);
        q.carry = total - Math.floor(total);
        q.flash = [];
        q.groups = null;
        if (q.chain >= 2) {
          q.popText = `${q.chain} chaîne !`;
          q.popT = 1.2;
          sfx('point');
        } else sfx('pop');
        q.step = 'check';
        q.timer = 0.18;
        return;
      }
      gravity(q.grid);
      const groups = findGroups(q.grid);
      if (!groups.length) {
        finish(q, o);
        return;
      }
      q.chain++;
      q.groups = groups;
      q.flash = groups.flatMap((g) => g.cells);
      q.step = 'pop';
      q.timer = 0.45;
    }

    // IA : s'aligne sur la meilleure position calculée à l'apparition, puis accélère la chute
    function drive(q, dt) {
      const a = q.ai;
      if (!a || !q.piece) return;
      a.t -= dt;
      if (a.t > 0) return;
      a.t = 0.1;
      if (q.piece.rot !== a.rot) act(q.p, 'rot');
      else if (q.piece.x < a.x) act(q.p, 'right');
      else if (q.piece.x > a.x) act(q.p, 'left');
      else q.aiSoft = true;
    }

    const softHeld = (p) => [...holds.values()].some((h) => h.p === p && h.a === 'down');

    function update(q, dt) {
      const o = pl[3 - q.p];
      q.elapsed += dt;
      if (q.popT > 0) q.popT -= dt;
      if (q.phase === 'fall') {
        if (isAI(q.p)) drive(q, dt);
        const held = softHeld(q.p);
        if (!held) q.softLock = false;
        q.soft = (held && !q.softLock) || q.aiSoft;
        q.iv = q.soft ? 0.04 : Math.max(0.28, 0.8 - q.elapsed * 0.004);
        q.t += dt;
        while (q.t >= q.iv && q.phase === 'fall' && q.piece) {
          q.t -= q.iv;
          const n = fall(q.grid, q.piece);
          if (n) q.piece = n;
          else land(q);
        }
      } else if (q.phase === 'resolve') {
        q.timer -= dt;
        if (q.timer <= 0) stepResolve(q, o);
      }
    }

    function endRound() {
      const d1 = pl[1].phase === 'dead';
      const d2 = pl[2].phase === 'dead';
      if (over || (!d1 && !d2)) return;
      over = true;
      sfx('crash');
      if (!(d1 && d2)) onpoint(d1 ? 2 : 1);
      setTimeout(() => { if (alive) fresh(); }, 1700);
    }

    // --- commandes (tactile + clavier) ---
    function btns(p) {
      const wide = mode === '1p';
      const x0 = wide ? 6 : BX[p];
      const w = wide ? 348 : 156;
      const bw = (w - 8) / 2;
      const y0 = 398;
      const bh = 92;
      return [
        ['left', '←', x0, y0],
        ['right', '→', x0 + bw + 8, y0],
        ['rot', '↻', x0, y0 + bh + 8],
        ['down', '↓', x0 + bw + 8, y0 + bh + 8]
      ].map(([a, l, x, y]) => ({ a, l, x, y, w: bw, h: bh }));
    }

    function press(id, p, a) {
      if (holds.has(id)) return;
      holds.set(id, { p, a, t: 0.2 });
      if (a !== 'down') act(p, a);
    }

    function down(e) {
      const q = pos(e, cv);
      try { cv.setPointerCapture(e.pointerId); } catch { /* sans importance */ }
      for (const p of players) {
        for (const b of btns(p)) {
          if (q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h) press('ptr' + e.pointerId, p, b.a);
        }
      }
    }
    const up = (e) => holds.delete('ptr' + e.pointerId);

    const KEYS = {
      ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'], ArrowUp: [1, 'rot'], ArrowDown: [1, 'down'],
      KeyA: [2, 'left'], KeyD: [2, 'right'], KeyW: [2, 'rot'], KeyS: [2, 'down']
    };
    function keydown(e) {
      const k = KEYS[e.code];
      if (!k) return;
      e.preventDefault();
      if (!e.repeat) press('key' + e.code, mode === '1p' ? 1 : k[0], k[1]);
    }
    const keyup = (e) => holds.delete('key' + e.code);

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    // --- dessin ---
    function puyoLayer(items, links, r) {
      ctx.fillStyle = INK;
      for (const it of items) { ctx.beginPath(); ctx.arc(it.cx, it.cy, r, 0, Math.PI * 2); ctx.fill(); }
      for (const [a, b] of links) {
        if (a.cy === b.cy) ctx.fillRect(Math.min(a.cx, b.cx), a.cy - r, Math.abs(a.cx - b.cx), 2 * r);
        else ctx.fillRect(a.cx - r, Math.min(a.cy, b.cy), 2 * r, Math.abs(a.cy - b.cy));
      }
      const ri = r - 2.5;
      for (const it of items) {
        ctx.fillStyle = COL[it.c];
        ctx.beginPath(); ctx.arc(it.cx, it.cy, ri, 0, Math.PI * 2); ctx.fill();
      }
      for (const [a, b] of links) {
        ctx.fillStyle = COL[a.c];
        if (a.cy === b.cy) ctx.fillRect(Math.min(a.cx, b.cx), a.cy - ri, Math.abs(a.cx - b.cx), 2 * ri);
        else ctx.fillRect(a.cx - ri, Math.min(a.cy, b.cy), 2 * ri, Math.abs(a.cy - b.cy));
      }
      for (const it of items) {
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(it.cx - r * 0.45, it.cy - r * 0.5, r * 0.2, 0, Math.PI * 2); ctx.fill();
        if (it.c === GARBAGE) continue;
        for (const side of [-1, 1]) {
          const ex = it.cx + side * r * 0.36;
          const ey = it.cy - r * 0.05;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ex, ey, r * 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.arc(ex, ey + 1, r * 0.14, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    function drawBoard(q) {
      const x0 = BX[q.p];
      const color = q.p === 1 ? C1 : C2;
      const name = isAI(q.p) ? 'IA' : `J${q.p}`;
      shout(ctx, name, x0 + 24, 28, 20, color);
      if (q.pending > 0) {
        blob(ctx, x0 + 66, 28, 9, COL[GARBAGE], { w: 2, shadow: 0 });
        shout(ctx, `${q.pending}`, x0 + 90, 29, 17, '#fff');
      }
      const pair = pairAt(q.idx);
      blob(ctx, x0 + 140, 19, 8, COL[pair[0]], { w: 2, shadow: 0, hl: false });
      blob(ctx, x0 + 140, 37, 8, COL[pair[1]], { w: 2, shadow: 0, hl: false });

      slab(ctx, x0 - 4, BY - 4, COLS * S + 8, ROWS * S + 8, 12, '#fffaf0', { lw: 3, shadow: 4 });
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, BY, COLS * S, ROWS * S); ctx.clip();
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#fff3d4' : '#ffeab8';
          ctx.fillRect(x * S + x0, BY + y * S, S, S);
        }
      }
      if (q.grid[3][2]) {
        ctx.fillStyle = 'rgba(255,60,60,.4)';
        ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✕', x0 + 2.5 * S, BY + 0.5 * S);
      }

      const r = S / 2 - 1.5;
      const blink = Math.floor(clock * 12) % 2 === 0;
      const flashing = new Set(q.flash.map(([x, y]) => y * COLS + x));
      const items = [];
      const at = {};
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const c = q.grid[y][x];
          if (!c || (flashing.has(y * COLS + x) && blink)) continue;
          const it = { cx: x0 + (x + 0.5) * S, cy: BY + (y + 0.5) * S, c };
          at[y * COLS + x] = it;
          items.push(it);
        }
      }
      const links = [];
      for (const key of Object.keys(at)) {
        const k = Number(key);
        const it = at[k];
        if (it.c === GARBAGE) continue;
        const rt = (k % COLS) + 1 < COLS ? at[k + 1] : null;
        const dn = at[k + COLS];
        if (rt && rt.c === it.c) links.push([it, rt]);
        if (dn && dn.c === it.c) links.push([it, dn]);
      }
      if (q.piece) {
        const p = q.piece;
        const [sx, sy] = satellite(p);
        const oy = fall(q.grid, p) ? (q.t / q.iv) * S : 0;
        const a = { cx: x0 + (p.x + 0.5) * S, cy: BY + (p.y + 0.5) * S + oy, c: p.a };
        const b = { cx: x0 + (sx + 0.5) * S, cy: BY + (sy + 0.5) * S + oy, c: p.b };
        items.push(a, b);
        if (p.a === p.b) links.push([a, b]);
        // ombre de l'atterrissage
        let g = p;
        for (let n = fall(q.grid, g); n; n = fall(q.grid, g)) g = n;
        const [gx, gy] = satellite(g);
        ctx.fillStyle = 'rgba(31,26,46,.16)';
        for (const [cx, cy] of [[g.x, g.y], [gx, gy]]) {
          if (cy < 0) continue;
          ctx.beginPath(); ctx.arc(x0 + (cx + 0.5) * S, BY + (cy + 0.5) * S, 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      puyoLayer(items, links, r);
      ctx.restore();

      if (q.popT > 0) shout(ctx, q.popText, x0 + (COLS * S) / 2, BY + 100, 24, '#ffd84d');
      if (q.phase === 'dead') shout(ctx, 'Perdu !', x0 + (COLS * S) / 2, BY + (ROWS * S) / 2, 28, '#fff');
      else if (over) shout(ctx, 'Gagné !', x0 + (COLS * S) / 2, BY + (ROWS * S) / 2, 28, '#ffd84d');
    }

    function drawControls() {
      for (const p of players) {
        for (const b of btns(p)) {
          const on = [...holds.values()].some((h) => h.p === p && h.a === b.a);
          slab(ctx, b.x, on ? b.y + 3 : b.y, b.w, b.h, 18, on ? '#ffd84d' : '#fff', { lw: 3, shadow: on ? 1 : 5 });
          shout(ctx, b.l, b.x + b.w / 2, (on ? b.y + 3 : b.y) + b.h / 2 + 2, 38, p === 1 ? C1 : C2);
        }
      }
    }

    function draw() {
      dots(ctx, '#ffe27a');
      drawBoard(pl[1]);
      drawBoard(pl[2]);
      drawControls();
      if (wait > 0) {
        shout(ctx, 'Prêt ?', W / 2, H - 28, 26, '#fff');
      }
    }

    const stop = startLoop((dt) => {
      clock += dt;
      for (const h of holds.values()) {
        if (h.a !== 'left' && h.a !== 'right') continue;
        h.t -= dt;
        while (h.t <= 0) { act(h.p, h.a); h.t += 0.085; }
      }
      if (wait > 0) wait -= dt;
      else if (!over) {
        update(pl[1], dt);
        update(pl[2], dt);
        endRound();
      }
      draw();
    });

    return () => {
      alive = false;
      stop();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: min(100cqw, 100cqh * 9 / 16); aspect-ratio: 9 / 16; height: auto; }
</style>
