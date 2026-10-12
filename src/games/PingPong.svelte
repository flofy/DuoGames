<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const PW = 90, PH = 12, R = 9, Y1 = H - 40, Y2 = 40;
    const px = { 1: W / 2, 2: W / 2 };
    let ball;
    let wait = 0.9;

    function serve(dir) {
      const a = (Math.random() - 0.5) * 0.9;
      ball = { x: W / 2, y: H / 2, vx: 300 * Math.sin(a), vy: dir * 300 * Math.cos(a) };
    }
    serve(Math.random() < 0.5 ? 1 : -1);

    function move(e) {
      if (e.pointerType === 'mouse' && !e.buttons) return;
      const q = pos(e, cv);
      const x = clamp(q.x, PW / 2, W - PW / 2);
      if (mode === '1p' || q.y > H / 2) px[1] = x;
      else px[2] = x;
    }
    const down = (e) => { cv.setPointerCapture(e.pointerId); move(e); };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);

    function hit(p, y, dir) {
      const approaching = dir === -1 ? ball.vy > 0 : ball.vy < 0;
      if (!approaching) return;
      if (Math.abs(ball.y - y) < PH / 2 + R && Math.abs(ball.x - px[p]) < PW / 2 + R) {
        const sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, 720);
        const a = clamp((ball.x - px[p]) / (PW / 2), -1, 1) * 1.0;
        ball.vx = sp * Math.sin(a);
        ball.vy = dir * sp * Math.cos(a);
        ball.y = y + dir * (PH / 2 + R);
        sfx('bounce');
      }
    }

    function draw() {
      ctx.fillStyle = '#19c3a3'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      for (let y = 0; y < H; y += 80) ctx.fillRect(0, y, W, 40);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(16, 16, W - 32, H - 32);
      ctx.beginPath(); ctx.moveTo(W / 2, 16); ctx.lineTo(W / 2, H - 16); ctx.stroke();
      slab(ctx, -6, H / 2 - 8, W + 12, 16, 0, '#fff', { shadow: 3 });
      ink(ctx, 1.5);
      for (let x = 8; x < W; x += 12) { ctx.beginPath(); ctx.moveTo(x, H / 2 - 8); ctx.lineTo(x, H / 2 + 8); ctx.stroke(); }
      slab(ctx, px[1] - PW / 2, Y1 - PH / 2 - 2, PW, PH + 4, 8, C1);
      slab(ctx, px[2] - PW / 2, Y2 - PH / 2 - 2, PW, PH + 4, 8, C2);
      blob(ctx, ball.x, ball.y, R + 1, '#fff');
    }

    const stop = startLoop((dt) => {
      if (mode === '1p') {
        const goal = ball.vy < 0 ? ball.x : W / 2;
        px[2] = clamp(px[2] + clamp(goal - px[2], -250 * dt, 250 * dt), PW / 2, W - PW / 2);
      }
      if (wait > 0) {
        wait -= dt;
      } else {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
        hit(1, Y1, -1);
        hit(2, Y2, 1);
        if (ball.y > H + R * 2) { onpoint(2); wait = 0.9; serve(1); }
        else if (ball.y < -R * 2) { onpoint(1); wait = 0.9; serve(-1); }
      }
      draw();
    });

    return () => {
      stop();
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: 100%; height: 100%; }
</style>
