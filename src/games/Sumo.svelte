<script>
  import { sfx } from '../lib/sfx.svelte.js';
  import { onMount } from 'svelte';
  import { W, H, C1, C2, INK, FONT, pos, startLoop, clamp, ink, blob, slab, shout, banner, dots } from '../lib/canvas.js';

  let { mode, onpoint } = $props();
  let cv;

  onMount(() => {
    const ctx = cv.getContext('2d');
    const AR = 150, SR = 28, CX = W / 2, CY = H / 2;
    const CD = 0.7;
    let a, over = 0, aiT = 1;

    function reset() {
      a = {
        1: { x: CX, y: CY + 85, vx: 0, vy: 0, cd: 0 },
        2: { x: CX, y: CY - 85, vx: 0, vy: 0, cd: 0 }
      };
    }
    reset();

    function dash(p) {
      const s = a[p], o = a[3 - p];
      if (s.cd > 0 || over > 0) return;
      const dx = o.x - s.x, dy = o.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      s.vx += (dx / d) * 430;
      s.vy += (dy / d) * 430;
      s.cd = CD;
      sfx('whoosh');
    }

    function down(e) {
      const q = pos(e, cv);
      if (mode === '1p' || q.y > H / 2) dash(1);
      else dash(2);
    }
    cv.addEventListener('pointerdown', down);

    function collide() {
      const p = a[1], q = a[2];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < SR * 2 && d > 0) {
        const nx = dx / d, ny = dy / d;
        const push = (SR * 2 - d) / 2;
        p.x -= nx * push; p.y -= ny * push;
        q.x += nx * push; q.y += ny * push;
        const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (vn < 0) {
          const j = (-(1 + 0.95) * vn) / 2;
          p.vx -= j * nx; p.vy -= j * ny;
          q.vx += j * nx; q.vy += j * ny;
          if (vn < -60) sfx('bump');
        }
      }
    }

    function draw() {
      dots(ctx, '#ffd166');
      blob(ctx, CX, CY, AR + 16, '#e63946', { w: 4, shadow: 6, hl: false });
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.setLineDash([10, 12]);
      ctx.beginPath(); ctx.arc(CX, CY, AR + 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      blob(ctx, CX, CY, AR, '#f6dba3', { w: 4, shadow: 0, hl: false });
      ctx.strokeStyle = '#d9a95f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(CX, CY, AR - 22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX - 24, CY - 9); ctx.lineTo(CX + 24, CY - 9); ctx.moveTo(CX - 24, CY + 9); ctx.lineTo(CX + 24, CY + 9); ctx.stroke();
      for (const p of [1, 2]) {
        const s = a[p], o = a[3 - p];
        blob(ctx, s.x, s.y, SR, p === 1 ? C1 : C2, { w: 4, shadow: 4 });
        const ang = Math.atan2(o.y - s.y, o.x - s.x), cs = Math.cos(ang), sn = Math.sin(ang);
        for (const side of [-1, 1]) {
          const ex = s.x + cs * 7 - sn * 8 * side, ey = s.y + sn * 7 + cs * 8 * side;
          blob(ctx, ex, ey, 6.5, '#fff', { w: 2, shadow: 0, hl: false });
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex + cs * 2.6, ey + sn * 2.6, 3, 0, Math.PI * 2); ctx.fill();
          ink(ctx, 2.5); ctx.beginPath();
          ctx.moveTo(ex - cs * 3 - sn * 5 * side, ey - sn * 3 + cs * 5 * side);
          ctx.lineTo(ex + cs * 5 + sn * 4 * side, ey + sn * 5 - cs * 4 * side); ctx.stroke();
        }
        if (s.cd > 0) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(s.x, s.y, SR + 9, -Math.PI / 2, -Math.PI / 2 + (s.cd / CD) * Math.PI * 2); ctx.stroke();
        }
      }
    }

    const stop = startLoop((dt) => {
      if (over > 0) {
        over -= dt;
        if (over <= 0) reset();
      } else if (mode === '1p') {
        aiT -= dt;
        if (aiT <= 0) { dash(2); aiT = 0.7 + Math.random() * 0.9; }
      }
      const f = Math.pow(0.12, dt);
      for (const p of [1, 2]) {
        const s = a[p];
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.vx *= f; s.vy *= f;
        s.cd = Math.max(0, s.cd - dt);
      }
      collide();
      if (over <= 0) {
        for (const p of [1, 2]) {
          const s = a[p];
          if (Math.hypot(s.x - CX, s.y - CY) > AR + SR * 0.3) {
            onpoint(3 - p);
            over = 1.1;
            break;
          }
        }
      }
      draw();
    });

    return () => {
      stop();
      cv.removeEventListener('pointerdown', down);
    };
  });
</script>

<canvas bind:this={cv} width={W} height={H}></canvas>

<style>
  canvas { width: 100%; height: 100%; }
</style>
