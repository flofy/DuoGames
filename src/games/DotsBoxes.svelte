<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const BW = 5, BH = 7, S = 56, X0 = 40, Y0 = 124;
    const name = (p) => (p === 2 && mode === '1p' ? 'IA' : 'J' + p);
    let hE, vE, box, turn, score, over, msg = '', msgT = 0, aiTimer = null, resetTimer = null;

    function reset() {
      hE = Array.from({ length: BH + 1 }, () => Array(BW).fill(0));
      vE = Array.from({ length: BH }, () => Array(BW + 1).fill(0));
      box = Array.from({ length: BH }, () => Array(BW).fill(0));
      turn = 1; score = { 1: 0, 2: 0 }; over = false;
    }
    reset();

    const sides = (r, c) => (hE[r][c] ? 1 : 0) + (hE[r + 1][c] ? 1 : 0) + (vE[r][c] ? 1 : 0) + (vE[r][c + 1] ? 1 : 0);
    const flash = (t) => { msg = t; msgT = 1.5; };

    function adjacent(e) {
      const out = [];
      if (e.h) { if (e.r > 0) out.push([e.r - 1, e.c]); if (e.r < BH) out.push([e.r, e.c]); }
      else { if (e.c > 0) out.push([e.r, e.c - 1]); if (e.c < BW) out.push([e.r, e.c]); }
      return out;
    }

    function allEdges() {
      const list = [];
      for (let r = 0; r <= BH; r++) for (let c = 0; c < BW; c++) if (!hE[r][c]) list.push({ h: true, r, c });
      for (let r = 0; r < BH; r++) for (let c = 0; c <= BW; c++) if (!vE[r][c]) list.push({ h: false, r, c });
      return list;
    }

    function play(e) {
      if (over) return;
      (e.h ? hE : vE)[e.r][e.c] = turn;
      sfx('tick');
      let got = 0;
      for (const [r, c] of adjacent(e)) {
        if (!box[r][c] && sides(r, c) === 4) { box[r][c] = turn; score[turn]++; got++; sfx('pop'); }
      }
      if (score[1] + score[2] === BW * BH) { finish(); return; }
      if (!got) turn = 3 - turn;
      if (mode === '1p' && turn === 2) aiTimer = setTimeout(aiMove, 450);
    }

    function finish() {
      over = true;
      if (score[1] === score[2]) flash('Égalité, on rejoue');
      else {
        const w = score[1] > score[2] ? 1 : 2;
        flash(`${name(w)} gagne ${score[w]} à ${score[3 - w]}`);
        onpoint(w);
      }
      resetTimer = setTimeout(() => { reset(); if (mode === '1p' && turn === 2) aiMove(); }, 2200);
    }

    function aiMove() {
      if (over || turn !== 2) return;
      const edges = allEdges();
      const info = edges.map((e) => {
        const adj = adjacent(e);
        return {
          e,
          completes: adj.filter(([r, c]) => sides(r, c) === 3).length,
          gives: adj.filter(([r, c]) => sides(r, c) === 2).length
        };
      });
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)].e;
      const maxC = Math.max(...info.map((i) => i.completes));
      let chosen;
      if (maxC > 0) chosen = pick(info.filter((i) => i.completes === maxC));
      else {
        const safe = info.filter((i) => i.gives === 0);
        if (safe.length) chosen = pick(safe);
        else {
          const minG = Math.min(...info.map((i) => i.gives));
          chosen = pick(info.filter((i) => i.gives === minG));
        }
      }
      play(chosen);
    }

    function down(e) {
      if (over || (mode === '1p' && turn === 2)) return;
      const q = pos(e, cv);
      let best = null, bd = 28;
      for (const ed of allEdges()) {
        const mx = ed.h ? X0 + (ed.c + 0.5) * S : X0 + ed.c * S;
        const my = ed.h ? Y0 + ed.r * S : Y0 + (ed.r + 0.5) * S;
        const d = Math.hypot(q.x - mx, q.y - my);
        if (d < bd) { bd = d; best = ed; }
      }
      if (best) play(best);
    }
    cv.addEventListener('pointerdown', down);

    function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

    function draw(dt) {
      msgT = Math.max(0, msgT - dt);
      ctx.fillStyle = '#fff7dd'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#cfe9ff'; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 20) line(x, 0, x, H);
      for (let y = 0; y <= H; y += 20) line(0, y, W, y);
      ctx.strokeStyle = '#ff9aa8'; ctx.lineWidth = 2; line(18, 0, 18, H);
      for (let r = 0; r < BH; r++) for (let c = 0; c < BW; c++) {
        if (box[r][c]) {
          const cx = X0 + c * S, cy = Y0 + r * S;
          slab(ctx, cx + 4, cy + 4, S - 8, S - 8, 10, box[r][c] === 1 ? '#a9e6ff' : '#ffb7d0', { lw: 3, shadow: 0 });
          shout(ctx, box[r][c] === 1 ? '1' : '2', cx + S / 2, cy + S / 2 + 1, 24, box[r][c] === 1 ? C1 : C2);
        }
      }
      ctx.lineCap = 'round';
      ctx.setLineDash([1, 8]); ctx.strokeStyle = '#cdbf9c'; ctx.lineWidth = 4;
      for (let r = 0; r <= BH; r++) for (let c = 0; c < BW; c++) if (!hE[r][c]) line(X0 + c * S, Y0 + r * S, X0 + (c + 1) * S, Y0 + r * S);
      for (let r = 0; r < BH; r++) for (let c = 0; c <= BW; c++) if (!vE[r][c]) line(X0 + c * S, Y0 + r * S, X0 + c * S, Y0 + (r + 1) * S);
      ctx.setLineDash([]);
      const stroke = (x1, y1, x2, y2, o) => {
        ctx.strokeStyle = INK; ctx.lineWidth = 11; line(x1, y1, x2, y2);
        ctx.strokeStyle = o === 1 ? C1 : C2; ctx.lineWidth = 6; line(x1, y1, x2, y2);
      };
      for (let r = 0; r <= BH; r++) for (let c = 0; c < BW; c++) if (hE[r][c]) stroke(X0 + c * S, Y0 + r * S, X0 + (c + 1) * S, Y0 + r * S, hE[r][c]);
      for (let r = 0; r < BH; r++) for (let c = 0; c <= BW; c++) if (vE[r][c]) stroke(X0 + c * S, Y0 + r * S, X0 + c * S, Y0 + (r + 1) * S, vE[r][c]);
      for (let r = 0; r <= BH; r++) for (let c = 0; c <= BW; c++) blob(ctx, X0 + c * S, Y0 + r * S, 5.5, INK, { w: 0, shadow: 0, hl: false });
      slab(ctx, W / 2 - 74, 50, 148, 40, 14, turn === 2 ? C2 : '#fff', { shadow: turn === 2 ? 5 : 2 });
      shout(ctx, `${name(2)} : ${score[2]}`, W / 2, 71, 20, turn === 2 ? '#fff' : C2);
      slab(ctx, W / 2 - 74, 552, 148, 40, 14, turn === 1 ? C1 : '#fff', { shadow: turn === 1 ? 5 : 2 });
      shout(ctx, `J1 : ${score[1]}`, W / 2, 573, 20, turn === 1 ? '#fff' : C1);
      if (msgT > 0) banner(ctx, msg, 320);
    }

    const stop = startLoop(draw);
    return () => {
      stop();
      clearTimeout(aiTimer);
      clearTimeout(resetTimer);
      cv.removeEventListener('pointerdown', down);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: min(100cqw, 100cqh * 9 / 16); aspect-ratio: 9 / 16; height: auto; }
</style>
