/* Meridian Run — rendering: the whole valley in one canvas. A sky
   gradient that deepens with altitude, a low sun, two parallax
   mountain ridges, drifting clouds, a green valley floor with trees
   and a river, runway strips with markings, golden ring gates,
   birds, the parcel crate, and the title / pause / end screens.
   The camera chases the plane: the plane sits left of centre and
   the world scrolls past it. */
'use strict';

var Meridian = window.Meridian || (window.Meridian = {});

Meridian.CAM = { x: 0, y: 150, shake: 0 };

/* World y (altitude metres) -> screen y. The horizon sits where the
   camera looks: ground at the bottom of the frame when low. */
Meridian.makeProjector = function makeProjector(cam, W, H) {
  var scale = 2.1; // pixels per metre
  return {
    x: function (wx) { return wx - cam.x; },
    y: function (wy) { return H - 130 - (wy - (cam.y - 90)) * scale * 0.42; },
    scale: scale
  };
};

Meridian.drawSky = function drawSky(ctx, plane, W, H, t) {
  var altFrac = Math.max(0, Math.min(1, plane.y / 620));
  var top = Meridian.lerpColor([58, 110, 190], [24, 52, 110], altFrac);
  var mid = Meridian.lerpColor([127, 178, 229], [74, 110, 178], altFrac);
  var low = Meridian.lerpColor([214, 235, 250], [150, 180, 214], altFrac);
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sun, low in the west, warm
  var sx = 1060, sy = 120;
  var sg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 120);
  sg.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  sg.addColorStop(0.35, 'rgba(255, 214, 110, 0.55)');
  sg.addColorStop(1, 'rgba(255, 214, 110, 0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 130, sy - 130, 260, 260);
  ctx.fillStyle = '#ffdf7e';
  ctx.beginPath();
  ctx.arc(sx, sy, 34, 0, Math.PI * 2);
  ctx.fill();
};

Meridian.lerpColor = function lerpColor(a, b, t) {
  var r = Math.round(a[0] + (b[0] - a[0]) * t);
  var g = Math.round(a[1] + (b[1] - a[1]) * t);
  var bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
};

/* A jagged ridge drawn from a sine sum, tinted by distance. */
Meridian.drawRidge = function drawRidge(ctx, camX, par, baseY, amp, color, seed, W, H) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (var sx = 0; sx <= W; sx += 16) {
    var wx = camX * par + sx;
    var y = baseY
      + Math.sin(wx * 0.004 + seed) * amp
      + Math.sin(wx * 0.011 + seed * 2.3) * amp * 0.45;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
};

Meridian.drawClouds = function drawClouds(ctx, world, cam, W, H, t) {
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  for (var i = 0; i < world.clouds.length; i++) {
    var c = world.clouds[i];
    var sx = c.x + t * c.drift - cam.x * 0.92;
    sx = ((sx % (W + 400)) + W + 400) % (W + 400) - 200;
    var sy = 90 + (c.y - 320) * 0.35;
    var s = c.s;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 52 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - 34 * s, sy + 6 * s, 34 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 36 * s, sy + 7 * s, 36 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

Meridian.drawTerrain = function drawTerrain(ctx, world, cam, proj, W, H) {
  var x0 = cam.x - 40;
  var x1 = cam.x + W + 40;
  ctx.beginPath();
  ctx.moveTo(proj.x(x0), H);
  for (var wx = x0; wx <= x1; wx += 12) {
    ctx.lineTo(proj.x(wx), proj.y(Meridian.groundAt(wx, world)));
  }
  ctx.lineTo(proj.x(x1), H);
  ctx.closePath();
  var g = ctx.createLinearGradient(0, proj.y(60), 0, H);
  g.addColorStop(0, '#69a84f');
  g.addColorStop(0.5, '#4c8a3d');
  g.addColorStop(1, '#2f5d2a');
  ctx.fillStyle = g;
  ctx.fill();
  // river ribbon where the ground dips low
  ctx.strokeStyle = 'rgba(90, 160, 210, 0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  var started = false;
  for (var rx = x0; rx <= x1; rx += 12) {
    var gh = Meridian.groundAt(rx, world);
    if (gh < 42) {
      var sy = proj.y(gh - 3);
      if (!started) { ctx.moveTo(proj.x(rx), sy); started = true; }
      else ctx.lineTo(proj.x(rx), sy);
    } else if (started) {
      started = false;
    }
  }
  ctx.stroke();
  // trees
  for (var i = 0; i < world.trees.length; i++) {
    var tr = world.trees[i];
    if (tr.x < x0 || tr.x > x1) continue;
    var tx = proj.x(tr.x);
    var ty = proj.y(Meridian.groundAt(tr.x, world));
    var th = tr.h;
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(tx - 1.5, ty - th * 0.45, 3, th * 0.45);
    ctx.fillStyle = tr.kind === 0 ? '#2e6b2f' : tr.kind === 1 ? '#3a7d33' : '#256b4a';
    ctx.beginPath();
    ctx.moveTo(tx, ty - th);
    ctx.lineTo(tx - th * 0.42, ty - th * 0.35);
    ctx.lineTo(tx + th * 0.42, ty - th * 0.35);
    ctx.closePath();
    ctx.fill();
  }
};

Meridian.drawRunways = function drawRunways(ctx, world, cam, proj, W, H) {
  for (var i = 0; i < world.runways.length; i++) {
    var r = world.runways[i];
    var x0 = proj.x(r.x - r.half);
    var x1 = proj.x(r.x + r.half);
    if (x1 < -40 || x0 > W + 40) continue;
    var y = proj.y(r.ground);
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(x0, y - 6, x1 - x0, 10);
    ctx.fillStyle = '#f5f5f5';
    var dashes = 12;
    for (var d = 0; d < dashes; d++) {
      var dx = x0 + ((x1 - x0) * (d + 0.5)) / dashes;
      ctx.fillRect(dx - 7, y - 2, 14, 2);
    }
    ctx.fillStyle = '#ffd75e';
    ctx.font = '700 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(r.name, (x0 + x1) / 2, y - 18);
    ctx.textAlign = 'left';
  }
};

Meridian.drawRings = function drawRings(ctx, world, cam, proj, W, t) {
  for (var i = 0; i < world.rings.length; i++) {
    var ring = world.rings[i];
    var sx = proj.x(ring.x);
    if (sx < -120 || sx > W + 120) continue;
    var sy = proj.y(ring.y);
    var pulse = 1 + Math.sin(t * 3 + i) * 0.05;
    var rr = ring.r * pulse;
    if (ring.taken) {
      ctx.strokeStyle = 'rgba(120, 220, 140, 0.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rr, rr * 1.15, 0, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    var g = ctx.createRadialGradient(sx, sy, rr * 0.4, sx, sy, rr * 1.3);
    g.addColorStop(0, 'rgba(255, 215, 94, 0.12)');
    g.addColorStop(1, 'rgba(255, 215, 94, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, rr * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rr, rr * 1.15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rr - 5, rr * 1.15 - 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff3c4';
    ctx.font = '700 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(ring.index + 1), sx, sy + 8);
    ctx.textAlign = 'left';
  }
};

Meridian.drawBirds = function drawBirds(ctx, world, cam, proj, W, t) {
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2.5;
  for (var i = 0; i < world.birds.length; i++) {
    var b = Meridian.birdAt(world.birds[i], t);
    var sx = proj.x(b.x);
    if (sx < -30 || sx > W + 30) continue;
    var sy = proj.y(b.y);
    var flap = b.flap * 7;
    ctx.beginPath();
    ctx.moveTo(sx - 11, sy - flap);
    ctx.quadraticCurveTo(sx - 3, sy + 2, sx, sy);
    ctx.quadraticCurveTo(sx + 3, sy + 2, sx + 11, sy - flap);
    ctx.stroke();
  }
};

Meridian.drawParcel = function drawParcel(ctx, world, cam, proj, W) {
  if (!world.parcel || world.parcel.delivered) return;
  var sx = proj.x(world.parcel.x);
  if (sx < -60 || sx > W + 60) return;
  var sy = proj.y(Meridian.groundAt(world.parcel.x, world));
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(sx - 16, sy - 26, 32, 22);
  ctx.strokeStyle = '#5d3a17';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx - 16, sy - 26, 32, 22);
  ctx.beginPath();
  ctx.moveTo(sx, sy - 26); ctx.lineTo(sx, sy - 4);
  ctx.moveTo(sx - 16, sy - 15); ctx.lineTo(sx + 16, sy - 15);
  ctx.stroke();
  ctx.fillStyle = '#ffd75e';
  ctx.font = '700 14px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PARCEL', sx, sy - 34);
  ctx.textAlign = 'left';
};

/* --- screens --- */
Meridian.drawTitle = function drawTitle(ctx, W, H, missionIndex, t) {
  ctx.fillStyle = 'rgba(8, 22, 44, 0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd75e';
  ctx.font = '700 84px "Segoe UI", Arial, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.fillText('MERIDIAN RUN', W / 2, 190);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 26px "Segoe UI", Arial, sans-serif';
  ctx.fillText('A bush-plane courier over the valley — rings, runways, weather.', W / 2, 238);
  var y = 330;
  for (var i = 0; i < Meridian.MISSIONS.length; i++) {
    var m = Meridian.MISSIONS[i];
    var sel = i === missionIndex;
    ctx.fillStyle = sel ? 'rgba(255, 215, 94, 0.92)' : 'rgba(8, 22, 44, 0.72)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 330, y - 34, 660, 72, 10);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.fillStyle = sel ? '#0b1526' : '#ffffff';
    ctx.font = '700 24px "Segoe UI", Arial, sans-serif';
    ctx.fillText((i + 1) + '  ' + m.name, W / 2, y - 2);
    ctx.fillStyle = sel ? '#3a2f00' : '#cfe3ff';
    ctx.font = '600 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText(m.tag, W / 2, y + 24);
    y += 88;
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px "Segoe UI", Arial, sans-serif';
  var blink = (Math.sin(t * 3) + 1) / 2 > 0.35;
  if (blink) ctx.fillText('Press ENTER to fly — ↑/↓ pitch · ←/→ throttle · mouse steers', W / 2, y + 26);
  ctx.font = '600 16px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('Fly the rings, land soft, mind the fuel. Birds bite. The storm does not forgive.', W / 2, y + 58);
  ctx.restore();
};

Meridian.drawEnd = function drawEnd(ctx, W, H, run, plane) {
  ctx.fillStyle = run.status === 'won' ? 'rgba(10, 50, 24, 0.55)' : 'rgba(60, 10, 8, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = run.status === 'won' ? '#7dff9b' : '#ff8a7a';
  ctx.font = '700 64px "Segoe UI", Arial, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 14;
  ctx.fillText(run.status === 'won' ? 'SORTIE COMPLETE' : 'SORTIE LOST', W / 2, 300);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 24px "Segoe UI", Arial, sans-serif';
  ctx.fillText(run.endReason, W / 2, 350);
  ctx.fillStyle = '#ffd75e';
  ctx.font = '700 34px "Segoe UI", Arial, sans-serif';
  ctx.fillText('SCORE  ' + Math.round(run.score), W / 2, 420);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '600 19px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Rings ' + run.ringsTaken + '   ·   Landings ' + run.landings +
    '   ·   Time ' + Math.round(run.elapsed) + 's   ·   Fuel left ' + Math.round(plane.fuel) + '%' +
    (run.bonus ? '   ·   Bonus +' + run.bonus : ''), W / 2, 462);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Press R to fly again, or 1/2/3 to pick another mission', W / 2, 520);
  ctx.restore();
};

Meridian.drawPaused = function drawPaused(ctx, W, H) {
  ctx.fillStyle = 'rgba(8, 22, 44, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 56px "Segoe UI", Arial, sans-serif';
  ctx.fillText('PAUSED', W / 2, 380);
  ctx.font = '600 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Press P to keep flying', W / 2, 420);
  ctx.restore();
};
