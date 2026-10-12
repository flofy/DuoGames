<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const CW = 18, CH = 32, S = 20;
    const TICK = 0.11;
    let snakes, acc = 0, pause = 0;

    function fresh() {
      snakes = {
        1: { dx: 0, dy: -1, body: [[9, 28]], turn: 0 },
        2: { dx: 0, dy: 1, body: [[8, 3]], turn: 0 }
      };
      pause = 0.6;
    }
    fresh();

    const key = (x, y) => x + ',' + y;
    const free = (occ, x, y) => x >= 0 && y >= 0 && x < CW && y < CH && !occ.has(key(x, y));

    function occupied() {
      const occ = new Set();
      for (const p of [1, 2]) for (const [x, y] of snakes[p].body) occ.add(key(x, y));
      return occ;
    }

    // tourner à gauche = sens anti-horaire à l'écran, quel que soit le joueur
    const rot = (s, t) => (t === -1 ? [s.dy, -s.dx] : [-s.dy, s.dx]);

    function ai(s, occ) {
      const [hx, hy] = s.body[s.body.length - 1];
      const opts = [0, -1, 1]
        .map((t) => ({ t, d: t === 0 ? [s.dx, s.dy] : rot(s, t) }))
        .filter((o) => free(occ, hx + o.d[0], hy + o.d[1]));
      if (!opts.length) return;
      const straight = opts.find((o) => o.t === 0);
      s.turn = straight && Math.random() > 0.1 ? 0 : opts[Math.floor(Math.random() * opts.length)].t;
    }

    function step() {
      const occ = occupied();
      if (mode === '1p') ai(snakes[2], occ);
      const next = {};
      for (const p of [1, 2]) {
        const s = snakes[p];
        if (s.turn) { [s.dx, s.dy] = rot(s, s.turn); s.turn = 0; }
        const [hx, hy] = s.body[s.body.length - 1];
        next[p] = [hx + s.dx, hy + s.dy];
      }
      const dead = {};
      for (const p of [1, 2]) dead[p] = !free(occ, next[p][0], next[p][1]);
      if (next[1][0] === next[2][0] && next[1][1] === next[2][1]) dead[1] = dead[2] = true;
      if (!dead[1] && !dead[2]) {
        snakes[1].body.push(next[1]);
        snakes[2].body.push(next[2]);
        return;
      }
      if (dead[1] && !dead[2]) onpoint(2);
      else if (dead[2] && !dead[1]) onpoint(1);
      pause = 1.1;
      sfx('crash');
      setTimeout(() => { if (alive) fresh(); }, 1100);
    }

    let alive = true;

    function turn(p, t) { snakes[p].turn = t; sfx('tick'); }
    function down(e) {
      const q = pos(e, cv);
      if (mode === '1p') turn(1, q.x < W / 2 ? -1 : 1);
      else if (q.y > H / 2) turn(1, q.x < W / 2 ? -1 : 1);
      else turn(2, q.x > W / 2 ? -1 : 1); // J2 est tourné à 180°
    }
    cv.addEventListener('pointerdown', down);

    function draw() {
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#a5e86b' : '#94de58';
        ctx.fillRect(x * S, y * S, S, S);
      }
      ctx.font = `700 44px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(31,26,46,.16)';
      ctx.fillText('↺', W * 0.25, H - 40); ctx.fillText('↻', W * 0.75, H - 40);
      if (mode === '2p') { ctx.fillText('↻', W * 0.25, 40); ctx.fillText('↺', W * 0.75, 40); }
      for (const p of [1, 2]) {
        const sn = snakes[p], b = sn.body, col = p === 1 ? C1 : C2;
        b.forEach(([x, y], i) => {
          const head = i === b.length - 1;
          slab(ctx, x * S + 1.5, y * S + 1.5, S - 3, S - 3, head ? 9 : 7, col, { lw: 2.5, shadow: head ? 3 : 0 });
        });
        const [hx, hy] = b[b.length - 1];
        const cx = hx * S + S / 2, cy = hy * S + S / 2;
        for (const side of [-1, 1]) {
          const ex = cx + sn.dx * 3 - sn.dy * 4.5 * side, ey = cy + sn.dy * 3 + sn.dx * 4.5 * side;
          blob(ctx, ex, ey, 3.8, '#fff', { w: 1.6, shadow: 0, hl: false });
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex + sn.dx * 1.3, ey + sn.dy * 1.3, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    const stop = startLoop((dt) => {
      if (pause > 0) pause -= dt;
      else {
        acc += dt;
        while (acc >= TICK) { acc -= TICK; step(); if (pause > 0) break; }
      }
      draw();
    });

    return () => {
      alive = false;
      stop();
      cv.removeEventListener('pointerdown', down);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: min(100cqw, 100cqh * 9 / 16); aspect-ratio: 9 / 16; height: auto; }
</style>
