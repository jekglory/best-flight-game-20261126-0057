/* Meridian Run — the aircraft: a little high-wing bush plane drawn
   from paths, plus its exhaust and smoke particles. The plane is
   drawn pointing right with a pitch rotation; the propeller spins
   with airspeed, the landing gear tucks away once airborne, and a
   damaged plane trails smoke. */
'use strict';

var Meridian = window.Meridian || (window.Meridian = {});

/* Exhaust puffs and crash smoke, kept in a small ring buffer. */
Meridian.newParticles = function newParticles() {
  return { list: [], spawn: 0 };
};

Meridian.updateParticles = function updateParticles(parts, plane, dt, crashed) {
  parts.spawn -= dt;
  if (!plane.onGround && plane.fuel > 0 && parts.spawn <= 0) {
    parts.spawn = 0.05;
    parts.list.push({
      x: plane.x - 26, y: plane.y + 2, vx: -14, vy: 2 + Math.random() * 2,
      life: 0.5, max: 0.5, size: 3, kind: 'puff'
    });
  }
  if (crashed || plane.damage > 55) {
    if (parts.spawn <= 0) {
      parts.spawn = 0.08;
      parts.list.push({
        x: plane.x - 10, y: plane.y - 4, vx: -6, vy: -14,
        life: 0.9, max: 0.9, size: 7, kind: 'smoke'
      });
    }
  }
  for (var i = parts.list.length - 1; i >= 0; i--) {
    var p = parts.list[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) parts.list.splice(i, 1);
  }
  if (parts.list.length > 90) parts.list.splice(0, parts.list.length - 90);
};

/* Draw the plane at screen position (sx, sy), pointing right, rotated
   by its pitch. scale is 1 at normal zoom. */
Meridian.drawPlane = function drawPlane(ctx, plane, sx, sy, scale) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-plane.pitch * Math.PI / 180);
  ctx.scale(scale, scale);

  // shadow of the wing on the fuselage side
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(-2, 12, 30, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // tail fin and stabiliser
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-30, -2); ctx.lineTo(-40, -20); ctx.lineTo(-30, -20); ctx.lineTo(-22, -3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a93226';
  ctx.beginPath();
  ctx.moveTo(-32, 2); ctx.lineTo(-44, 8); ctx.lineTo(-30, 8); ctx.lineTo(-24, 2);
  ctx.closePath(); ctx.fill();

  // fuselage: a rounded bush-plane body, sun-yellow with a red stripe
  var body = ctx.createLinearGradient(0, -12, 0, 10);
  body.addColorStop(0, '#ffd75e');
  body.addColorStop(0.55, '#f5b81e');
  body.addColorStop(1, '#d98f06');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-34, -4);
  ctx.quadraticCurveTo(-30, -12, -8, -12);
  ctx.quadraticCurveTo(18, -12, 30, -4);
  ctx.quadraticCurveTo(36, 0, 30, 4);
  ctx.quadraticCurveTo(10, 10, -14, 9);
  ctx.quadraticCurveTo(-32, 8, -34, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7a5200';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // red cheatline stripe
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-30, 1); ctx.lineTo(30, 1); ctx.lineTo(28, 5); ctx.lineTo(-28, 5);
  ctx.closePath(); ctx.fill();

  // cockpit windows, lit
  ctx.fillStyle = '#bfe9ff';
  ctx.beginPath();
  ctx.moveTo(2, -11); ctx.lineTo(16, -11); ctx.lineTo(20, -4); ctx.lineTo(4, -4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#274b7a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.moveTo(5, -10); ctx.lineTo(9, -10); ctx.lineTo(8, -5); ctx.lineTo(5, -5);
  ctx.closePath(); ctx.fill();

  // high wing with struts
  ctx.fillStyle = '#e8b10f';
  ctx.beginPath();
  ctx.moveTo(-16, -12); ctx.lineTo(6, -12); ctx.lineTo(2, -20); ctx.lineTo(-20, -20);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7a5200';
  ctx.stroke();
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -12); ctx.lineTo(-16, 2);
  ctx.moveTo(2, -12); ctx.lineTo(6, 2);
  ctx.stroke();

  // spinning propeller at the nose
  var a = plane.prop;
  ctx.strokeStyle = 'rgba(40,40,40,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(33 + Math.cos(a) * 15, Math.sin(a) * 15);
  ctx.lineTo(33 - Math.cos(a) * 15, -Math.sin(a) * 15);
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(33, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // landing gear (tucked once airborne and fast)
  if (plane.onGround || plane.vx < 40) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, 8); ctx.lineTo(-16, 17);
    ctx.moveTo(10, 8); ctx.lineTo(14, 17);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-16, 18, 4, 0, Math.PI * 2);
    ctx.arc(14, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    // little red wheel fairings
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(-16, 18, 2, 0, Math.PI * 2);
    ctx.arc(14, 18, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

/* Draw particles (world space, camera already applied). */
Meridian.drawParticles = function drawParticles(ctx, parts, camX, toScreenY) {
  for (var i = 0; i < parts.list.length; i++) {
    var p = parts.list[i];
    var a = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.kind === 'smoke'
      ? 'rgba(60,60,60,' + (a * 0.55).toFixed(2) + ')'
      : 'rgba(230,230,230,' + (a * 0.5).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(p.x - camX, toScreenY(p.y), p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
};
