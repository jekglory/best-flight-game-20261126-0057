/* Meridian Run — flight model: an arcade bush-plane model with real
   trade-offs. Throttle makes speed, speed makes lift, lift fights
   gravity; below stall speed the wing quits and the nose drops.
   Fuel burns with throttle, damage comes from hard contact, and a
   landing only counts when it is slow, level and on a runway. */
'use strict';

var Meridian = window.Meridian || (window.Meridian = {});

Meridian.PHYS = {
  maxSpeed: 92,        // m/s at full throttle, level flight
  stallSpeed: 24,      // m/s: below this the wing stops lifting
  gravity: 9.8,        // m/s^2
  accel: 26,           // m/s^2 of throttle authority
  drag: 0.16,          // 1/s quadratic-ish drag
  climbFactor: 0.62,   // how much of forward speed becomes climb at pitch
  pitchRate: 55,       // deg/s of pitch authority at speed
  fuelBurn: 0.55,      // fuel %/s at full throttle
  boostBurn: 1.6,      // extra fuel %/s while boosting
  gustStrength: 7      // m/s vertical gust in the storm mission
};

Meridian.newPlane = function newPlane() {
  return {
    x: 120, y: 150,          // world metres; y is altitude above sea level
    vx: 34, vy: 0,
    pitch: 0,                // degrees, + is nose up
    throttle: 0.55,
    fuel: 100,
    damage: 0,
    boost: false,
    airbrake: false,
    flaps: false,
    onGround: true,
    landed: false,
    crashed: false,
    prop: 0
  };
};

/* One fixed step (dt seconds). Returns an event string or ''.
   Events: 'stall', 'ring' is handled by missions, 'crash', 'landed',
   'bird', 'fuel-empty', 'out-of-bounds' (turned back). */
Meridian.stepPlane = function stepPlane(plane, input, world, mission, t, dt) {
  var P = Meridian.PHYS;
  var ev = '';

  if (plane.crashed) return ev;

  // --- on the ground after a landing: roll, brake, rotate to lift off ---
  if (plane.landed) {
    var rollThrust = plane.throttle * P.accel;
    var rollDrag = P.drag * plane.vx * Math.abs(plane.vx) / 60 + 6;
    if (input.airbrake) rollDrag += 26;
    plane.vx += (rollThrust - rollDrag) * dt;
    if (plane.vx < 0) plane.vx = 0;
    plane.x += plane.vx * dt;
    plane.fuel -= plane.throttle * P.fuelBurn * dt * 0.5;
    if (plane.fuel < 0) plane.fuel = 0;
    var rotate = input.pitchUp || plane.vx > 58;
    if (rotate && plane.vx >= P.stallSpeed + 6) {
      plane.landed = false;
      plane.onGround = false;
      plane.vy = 3;
      plane.pitch = 6;
      ev = 'takeoff';
    } else if (plane.vx < 0.5) {
      plane.vx = 0;
    }
    return ev;
  }

  // --- controls ---
  var pitchCmd = 0;
  if (input.pitchUp) pitchCmd += 1;
  if (input.pitchDown) pitchCmd -= 1;
  if (input.mouseSteer) pitchCmd += input.mousePitch;
  var authority = Math.min(1, plane.vx / P.stallSpeed);
  plane.pitch += pitchCmd * P.pitchRate * authority * dt;
  // No pitch command: the plane eases back toward level flight, so a
  // released stick does not leave it climbing forever.
  if (pitchCmd === 0 && !plane.onGround) {
    var levelRate = 10;
    if (plane.pitch > 0) plane.pitch = Math.max(0, plane.pitch - levelRate * dt);
    else if (plane.pitch < 0) plane.pitch = Math.min(0, plane.pitch + levelRate * dt);
  }
  if (plane.pitch > 42) plane.pitch = 42;
  if (plane.pitch < -30) plane.pitch = -30;

  var thr = plane.throttle;
  if (input.throttleUp) thr += 0.9 * dt;
  if (input.throttleDown) thr -= 0.9 * dt;
  if (input.mouseThrottle !== null && input.mouseThrottle !== undefined) {
    thr += (input.mouseThrottle - thr) * Math.min(1, dt * 3);
  }
  if (thr > 1) thr = 1;
  if (thr < 0) thr = 0;
  plane.throttle = thr;
  plane.boost = !!input.boost && plane.fuel > 0;
  plane.airbrake = !!input.airbrake;
  plane.flaps = !!input.flaps;

  // --- forces ---
  var thrust = thr * P.accel * (plane.boost ? 1.7 : 1);
  var drag = P.drag * plane.vx * Math.abs(plane.vx) / 60;
  if (plane.airbrake) drag += 22;
  if (plane.flaps) drag += 8;
  plane.vx += (thrust - drag) * dt;
  if (plane.vx < 0) plane.vx = 0;
  if (plane.vx > 150) plane.vx = 150;

  // Lift: enough speed + nose up = climb; below stall the wing quits.
  var rad = plane.pitch * Math.PI / 180;
  var lift = 0;
  if (plane.vx >= P.stallSpeed) {
    lift = Math.sin(rad) * plane.vx * P.climbFactor;
  } else {
    ev = 'stall';
    lift = Math.sin(rad) * plane.vx * 0.2;
  }
  var gust = 0;
  if (mission.gusts) {
    gust = Math.sin(t * 0.9 + plane.x * 0.0016) * P.gustStrength
         + Math.sin(t * 2.3 + plane.x * 0.004) * P.gustStrength * 0.4;
  }
  var vyTarget = lift + gust - (plane.vx < P.stallSpeed ? 14 : 0);
  plane.vy += (vyTarget - plane.vy) * Math.min(1, dt * 2.2);
  plane.vy -= P.gravity * 0.12 * dt; // gentle sink keeps the nose honest

  plane.x += plane.vx * dt;
  plane.y += plane.vy * dt;
  plane.prop += (4 + plane.vx * 0.55) * dt;

  // --- fuel ---
  var burn = thr * P.fuelBurn * dt + (plane.boost ? P.boostBurn * dt : 0);
  plane.fuel -= burn;
  if (plane.fuel <= 0) {
    plane.fuel = 0;
    plane.throttle = 0;
    if (!plane._fuelWarned) { plane._fuelWarned = true; ev = 'fuel-empty'; }
  }

  // --- ceiling and turn-back ---
  if (plane.y > 620) { plane.y = 620; if (plane.vy > 0) plane.vy = 0; }
  if (plane.x < 40) { plane.x = 40; plane.vx = Math.max(plane.vx, 12); }

  // --- ground contact ---
  var ground = Meridian.groundAt(plane.x, world);
  var clearance = plane.y - ground;
  if (clearance <= 2) {
    plane.y = ground + 2;
    var pad = Meridian.runwayAt(plane.x, world.runways);
    var soft = Math.abs(plane.vy) <= 4.5 && Math.abs(plane.pitch) <= 9 && plane.vx <= 46;
    if (pad && soft && plane.vx >= 8) {
      plane.onGround = true;
      plane.landed = true;
      plane.vy = 0;
      plane.vx *= (1 - Math.min(1, dt * 1.4));
      if (plane.vx < 1) plane.vx = 0;
      ev = 'landed';
    } else {
      var hard = Math.abs(plane.vy) > 4.5 || Math.abs(plane.pitch) > 9;
      plane.damage += hard ? 34 + Math.abs(plane.vy) * 4 : 12;
      plane.vy = Math.abs(plane.vy) * 0.25;
      plane.vx *= 0.55;
      plane.pitch = 0;
      if (plane.damage >= 100) {
        plane.damage = 100;
        plane.crashed = true;
        ev = 'crash';
      } else {
        ev = 'bump';
      }
    }
  } else {
    plane.onGround = false;
  }

  // --- birds ---
  for (var i = 0; i < world.birds.length; i++) {
    var b = Meridian.birdAt(world.birds[i], t);
    var dx = b.x - plane.x;
    var dy = b.y - plane.y;
    if (dx * dx + dy * dy < 26 * 26 && !world.birds[i]._hit) {
      world.birds[i]._hit = true;
      plane.damage += 15;
      plane.vy -= 5;
      if (plane.damage >= 100) {
        plane.damage = 100;
        plane.crashed = true;
        ev = 'crash';
      } else {
        ev = 'bird';
      }
    }
    if (Math.abs(dx) > 900) world.birds[i]._hit = false;
  }

  return ev;
};

/* Heading in degrees: the plane always flies east on this valley run,
   so heading reads 090 with a wobble from pitch and gusts — the
   compass strip shows 090 centred, drifting a few degrees. */
Meridian.headingDeg = function headingDeg(plane, t) {
  return 90 + Math.sin(t * 0.7) * 2.5 + plane.pitch * 0.12;
};
