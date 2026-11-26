/* Meridian Run — main: the game loop, screens and states, the
   deterministic screenshot scenes (?shot=start|play|danger|win) and
   the in-page logic test (?selftest=1). The loop steps physics at a
   fixed 60 Hz so a run plays the same way every time. */
'use strict';

(function main() {
  var M = window.Meridian;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = 1280, H = 800;
  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  var selftest = params.get('selftest') === '1';

  var input = M.newInput();
  var audio = M.newAudio();
  var state = 'title';            // title | flying | paused | over
  var missionIndex = 0;
  var mission = M.MISSIONS[missionIndex];
  var world = M.buildWorld(mission);
  var plane = M.newPlane();
  var run = M.newRun(mission);
  run._world = world;
  var parts = M.newParticles();
  var cam = { x: 0, y: 150, shake: 0 };
  var t = 0;
  var messages = [];              // {text, sub, tone, until}
  var frozen = false;

  plane.y = M.groundAt(plane.x, world) + 2;
  plane.fuel = mission.fuel;

  M.bindInput(input, canvas, function onGesture() {
    M.audioUnlock(audio);
  });

  function showMessage(text, sub, tone, secs) {
    messages.push({ text: text, sub: sub || '', tone: tone || '', until: t + (secs || 2.2) });
  }

  function startMission(index) {
    missionIndex = index;
    mission = M.MISSIONS[index];
    world = M.buildWorld(mission);
    plane = M.newPlane();
    run = M.newRun(mission);
    run._world = world;
    parts = M.newParticles();
    plane.y = M.groundAt(plane.x, world) + 2;
    plane.fuel = mission.fuel;
    cam.x = 0;
    cam.y = plane.y;
    cam.shake = 0;
    messages = [];
    state = 'flying';
    showMessage(mission.name, mission.briefing, '', 3.5);
  }

  function handleEvent(ev) {
    if (!ev) return;
    if (ev === 'stall') {
      // shown as a warning by the HUD; no message spam
    } else if (ev === 'fuel-empty') {
      showMessage('FUEL EMPTY', 'Glide her down — find a strip or a field.', 'bad', 3);
    } else if (ev === 'bird') {
      plane.damage = Math.min(100, plane.damage);
      showMessage('BIRD STRIKE!', 'Damage +15% — check the airframe.', 'bad', 2);
      M.audioBird(audio);
      cam.shake = 7;
    } else if (ev === 'bump') {
      showMessage('ROUGH TOUCHDOWN', 'Damage +' + Math.round(plane.damage) + '% — that one hurt.', 'bad', 2);
      cam.shake = 6;
    } else if (ev === 'crash') {
      M.audioCrash(audio);
      cam.shake = 14;
      run.status = 'lost';
      run.endReason = 'Airframe written off — the valley keeps another plane.';
      state = 'over';
    } else if (ev === 'landed') {
      var pts = M.onLanded(run, plane, world);
      if (pts > 0) {
        showMessage('TOUCHDOWN  +' + pts, 'Smooth and level — nicely flown.', 'good', 2.5);
        M.audioLand(audio);
      }
      if (run.status === 'won') {
        M.audioWin(audio);
        state = 'over';
      }
    }
  }

  function step(dt) {
    t += dt;
    if (state !== 'flying') return;
    run.elapsed += dt;
    var ev = M.stepPlane(plane, input, world, mission, t, dt);
    var ringPts = M.collectRings(run, plane, world);
    if (ringPts > 0) {
      showMessage('RING  +' + ringPts, 'Ring ' + run.ringsTaken + ' of ' + mission.rings + ' — keep it smooth.', 'good', 1.8);
      M.audioRing(audio);
    }
    handleEvent(ev);
    M.checkVerdict(run, plane, world);
    if (run.status === 'won' && state === 'flying') {
      M.audioWin(audio);
      state = 'over';
    } else if (run.status === 'lost' && state === 'flying') {
      state = 'over';
    }
    M.updateParticles(parts, plane, dt, plane.crashed);
    M.audioTick(audio, plane);
    // camera chases the plane, sitting left of centre
    var tx = plane.x - 300;
    var ty = plane.y;
    cam.x += (tx - cam.x) * Math.min(1, dt * 2.6);
    cam.y += (ty - cam.y) * Math.min(1, dt * 2.2);
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 22);
  }

  function render() {
    var shakeX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake : 0;
    var shakeY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    var proj = M.makeProjector(cam, W, H);
    M.drawSky(ctx, plane, W, H, t);
    M.drawRidge(ctx, cam.x, 0.25, 560, 70, '#7d9cc4', 3.1, W, H);
    M.drawRidge(ctx, cam.x, 0.5, 610, 46, '#5d7ea6', 7.7, W, H);
    M.drawClouds(ctx, world, cam, W, H, t);
    M.drawTerrain(ctx, world, cam, proj, W, H);
    M.drawRunways(ctx, world, cam, proj, W, H);
    M.drawRings(ctx, world, cam, proj, W, t);
    M.drawParcel(ctx, world, cam, proj, W);
    M.drawBirds(ctx, world, cam, proj, W, t);
    M.drawParticles(ctx, parts, cam.x, function (wy) { return proj.y(wy); });
    // the plane, left of centre
    var px = proj.x(plane.x);
    var py = proj.y(plane.y);
    M.drawPlane(ctx, plane, px, py, 1);
    ctx.restore();

    if (state === 'title') {
      M.drawTitle(ctx, W, H, missionIndex, t);
      return;
    }
    M.drawTopBar(ctx, plane, run, t);
    M.drawCompass(ctx, plane, t);
    M.drawInstruments(ctx, plane, t);
    M.drawThrottle(ctx, plane);
    // transient messages
    var showingMessage = false;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (t > messages[i].until) { messages.splice(i, 1); continue; }
      M.drawMessage(ctx, messages[i].text, messages[i].sub, messages[i].tone);
      showingMessage = true;
      break; // one at a time, newest first
    }
    // warnings only when no message is up, so the same alert never
    // prints twice (the danger scene's low-fuel message, for one)
    if (!showingMessage) M.drawWarnings(ctx, plane, run);
    if (state === 'paused') M.drawPaused(ctx, W, H);
    if (state === 'over') M.drawEnd(ctx, W, H, run, plane);
  }

  function pollKeys() {
    if (input.pressed.Enter && (state === 'title' || state === 'over')) {
      startMission(missionIndex);
    }
    if (input.pressed.KeyR && (state === 'over' || state === 'flying')) startMission(missionIndex);
    if (input.pressed.KeyP && (state === 'flying' || state === 'paused')) {
      state = state === 'flying' ? 'paused' : 'flying';
    }
    if (input.pressed.KeyM) audio.muted = !audio.muted;
    if (state === 'title') {
      if (input.pressed.Digit1) missionIndex = 0;
      if (input.pressed.Digit2) missionIndex = 1;
      if (input.pressed.Digit3) missionIndex = 2;
    }
    input.pressed = {};
  }

  /* --- deterministic screenshot scenes: frozen, no clock --- */
  function buildShot(name) {
    frozen = true;
    t = 12.5;
    if (name === 'start') {
      state = 'title';
      missionIndex = 0;
      mission = M.MISSIONS[0];
      world = M.buildWorld(mission);
      plane = M.newPlane();
      run = M.newRun(mission);
      run._world = world;
      plane.y = M.groundAt(plane.x, world) + 2;
      plane.fuel = mission.fuel;
      cam.x = plane.x - 300;
      cam.y = plane.y;
    } else if (name === 'play') {
      state = 'flying';
      missionIndex = 0;
      mission = M.MISSIONS[0];
      world = M.buildWorld(mission);
      plane = M.newPlane();
      run = M.newRun(mission);
      run._world = world;
      world.rings[0].taken = true;
      world.rings[1].taken = true;
      run.ringsTaken = 2;
      run.score = 1140;
      var ring = world.rings[2];
      plane.x = ring.x - 260;
      plane.y = ring.y + 26;
      plane.vx = 68;
      plane.vy = 2;
      plane.pitch = 4;
      plane.throttle = 0.72;
      plane.fuel = 71;
      plane.onGround = false;
      cam.x = plane.x - 300;
      cam.y = plane.y;
      showMessage('RING  +540', 'Ring 3 of 8 — keep it smooth.', 'good', 999);
    } else if (name === 'danger') {
      state = 'flying';
      missionIndex = 2;
      mission = M.MISSIONS[2];
      world = M.buildWorld(mission);
      plane = M.newPlane();
      run = M.newRun(mission);
      run._world = world;
      plane.x = 9300;
      plane.y = M.groundAt(9300, world) + 46;
      plane.vx = 41;
      plane.vy = -6;
      plane.pitch = -8;
      plane.throttle = 0.85;
      plane.fuel = 12;
      plane.damage = 68;
      plane.onGround = false;
      run.ringsTaken = 3;
      run.score = 2310;
      cam.x = plane.x - 300;
      cam.y = plane.y;
      showMessage('LOW FUEL — 12% LEFT', 'Storm gusts ahead. Find the strip.', '', 999);
    } else if (name === 'win') {
      state = 'over';
      missionIndex = 0;
      mission = M.MISSIONS[0];
      world = M.buildWorld(mission);
      plane = M.newPlane();
      run = M.newRun(mission);
      run._world = world;
      world.rings.forEach(function (r) { r.taken = true; });
      run.ringsTaken = 8;
      run.score = 6480;
      run.bonus = 640;
      run.elapsed = 96;
      run.status = 'won';
      run.endReason = 'All 8 rings threaded — a clean run over the valley.';
      plane.x = 4200;
      plane.y = M.groundAt(4200, world) + 90;
      plane.vx = 62;
      plane.pitch = 2;
      plane.throttle = 0.6;
      plane.fuel = 44;
      plane.onGround = false;
      cam.x = plane.x - 300;
      cam.y = plane.y;
    }
    document.title = 'SHOT ' + name;
  }

  /* --- in-page logic test: 14 assertions, reported in the DOM --- */
  function runSelfTest() {
    var results = [];
    function check(name, ok) {
      results.push((ok ? 'PASS ' : 'FAIL ') + name);
    }
    var seed = 4242;
    // 1. terrain is deterministic
    check('terrain-deterministic',
      M.groundHeight(1234, seed) === M.groundHeight(1234, seed));
    // 2. runway pads are flat
    var w1 = M.buildWorld(M.MISSIONS[1]);
    var pad = w1.runways[1];
    check('runway-flat',
      M.groundAt(pad.x - 100, w1) === pad.ground &&
      M.groundAt(pad.x + 100, w1) === pad.ground);
    // 3. throttle accelerates the plane
    var p = M.newPlane();
    p.onGround = false; p.y = 300;
    var v0 = p.vx;
    M.stepPlane(p, { throttleUp: false, throttleDown: false, pitchUp: false, pitchDown: false }, w1, M.MISSIONS[1], 0, 1);
    check('throttle-accelerates', p.vx > v0);
    // 4. below stall speed the wing quits (sinks)
    var ps = M.newPlane();
    ps.onGround = false; ps.y = 300; ps.vx = 10; ps.pitch = 15; ps.throttle = 0.2;
    var ev = '';
    for (var i = 0; i < 90; i++) ev = M.stepPlane(ps, {}, w1, M.MISSIONS[1], i / 60, 1 / 60) || ev;
    check('stall-sinks', ps.vy < 0 && ev.indexOf('stall') !== -1);
    // 5. fuel burns with throttle
    var pf = M.newPlane();
    pf.onGround = false; pf.y = 300; pf.throttle = 1;
    for (var j = 0; j < 600; j++) M.stepPlane(pf, {}, w1, M.MISSIONS[1], j / 60, 1 / 60);
    check('fuel-burns', pf.fuel < 95 && pf.fuel > 80);
    // 6. flying through a ring collects it
    var w0 = M.buildWorld(M.MISSIONS[0]);
    var r0 = M.newRun(M.MISSIONS[0]);
    var pr = M.newPlane();
    pr.x = w0.rings[0].x; pr.y = w0.rings[0].y; pr.vx = 60;
    var pts = M.collectRings(r0, pr, w0);
    check('ring-collects', pts >= 500 && r0.ringsTaken === 1 && w0.rings[0].taken);
    // 7. a soft touchdown on a runway lands the plane
    var pl = M.newPlane();
    pl.x = w1.runways[1].x; pl.y = w1.runways[1].ground + 2.1;
    pl.vy = -2; pl.vx = 30; pl.pitch = 0; pl.onGround = false;
    var landed = false;
    for (var k = 0; k < 120; k++) {
      var e2 = M.stepPlane(pl, {}, w1, M.MISSIONS[1], k / 60, 1 / 60);
      if (e2 === 'landed') { landed = true; break; }
    }
    check('soft-landing', landed && pl.landed);
    // 8. a hard touchdown wrecks the plane
    var pc = M.newPlane();
    pc.x = 5000; pc.y = M.groundAt(5000, w1) + 3;
    pc.vy = -14; pc.vx = 40; pc.pitch = 18; pc.onGround = false;
    var crashed = false;
    for (var m = 0; m < 900; m++) {
      var e3 = M.stepPlane(pc, {}, w1, M.MISSIONS[1], m / 60, 1 / 60);
      if (e3 === 'crash') { crashed = true; break; }
    }
    check('hard-landing-crashes', crashed && pc.crashed);
    // 9. a bird strike damages the plane
    var w2 = M.buildWorld(M.MISSIONS[0]);
    w2.birds = [{ x0: 3000, span: 1, y: 200, phase: 0, speed: 0.25, flap: 0 }];
    var pb = M.newPlane();
    pb.x = 3000; pb.y = 200; pb.vx = 50; pb.onGround = false;
    var d0 = pb.damage;
    M.stepPlane(pb, {}, w2, M.MISSIONS[0], 0, 1 / 60);
    check('bird-strike-damages', pb.damage === d0 + 15);
    // 10. mission 1 wins when all rings are taken
    var rw = M.newRun(M.MISSIONS[0]);
    rw.ringsTaken = 8;
    check('ring-run-wins', M.checkVerdict(rw, M.newPlane(), w0) === 'won');
    // 11. mission 2 wins after both landings
    var rw2 = M.newRun(M.MISSIONS[1]);
    rw2.landings = 2;
    check('island-hop-wins', M.checkVerdict(rw2, M.newPlane(), w1) === 'won');
    // 12. heading stays near east
    var hd = M.headingDeg(M.newPlane(), 3);
    check('heading-near-east', hd > 80 && hd < 100);
    // 13. world holds the mission's ring count
    check('world-ring-count', w0.rings.length === M.MISSIONS[0].rings);
    // 14. storm parcel delivers on a soft landing
    var w3 = M.buildWorld(M.MISSIONS[2]);
    var r3 = M.newRun(M.MISSIONS[2]);
    var pp = M.newPlane();
    pp.x = w3.runways[1].x; pp.y = w3.runways[1].ground + 2.1;
    pp.vy = -2; pp.vx = 30; pp.pitch = 0; pp.onGround = false;
    for (var n = 0; n < 120; n++) {
      if (M.stepPlane(pp, {}, w3, M.MISSIONS[2], n / 60, 1 / 60) === 'landed') break;
    }
    var gained = M.onLanded(r3, pp, w3);
    check('parcel-delivers', gained > 1000 && w3.parcel.delivered === true);
    var passed = results.filter(function (r) { return r.indexOf('PASS') === 0; }).length;
    var el = document.getElementById('selftest');
    el.textContent = 'SELFTEST ' + passed + '/' + results.length + '\n' + results.join('\n');
    el.classList.add('show');
    document.title = 'SELFTEST ' + passed + '/' + results.length;
  }

  if (selftest) {
    runSelfTest();
    render();
    return;
  }
  if (shot) {
    buildShot(shot);
    render();
    return;
  }

  var last = performance.now();
  var acc = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!frozen) {
      pollKeys();
      acc += dt;
      var steps = 0;
      while (acc >= 1 / 60 && steps < 5) {
        step(1 / 60);
        acc -= 1 / 60;
        steps++;
      }
      if (steps === 5) acc = 0;
    }
    render();
    requestAnimationFrame(frame);
  }
  render();
  requestAnimationFrame(frame);
})();
