/* Meridian Run — missions: three sorties with different goals over
   the same valley, plus scoring. A mission is data (name, seed,
   length, rings, stops, birds, gusts, fuel) and a small state machine
   that turns flight events into objectives, points and a verdict. */
'use strict';

var Meridian = window.Meridian || (window.Meridian = {});

Meridian.MISSIONS = [
  {
    id: 1, key: '1',
    name: 'RING RUN',
    tag: 'Fly all 8 golden rings before the fuel runs dry.',
    seed: 20261126,
    length: 16000,
    rings: 8,
    stops: [],
    birds: 6,
    gusts: false,
    fuel: 100,
    parcel: false,
    timeLimit: 0,
    briefing: 'Eight rings hang over the valley. Thread them all — smooth throttle, gentle turns, no heroics.'
  },
  {
    id: 2, key: '2',
    name: 'ISLAND HOP',
    tag: 'Land gently on both island strips. Soft touchdowns only.',
    seed: 711226,
    length: 17000,
    rings: 4,
    stops: [
      { x: 7500, name: 'PALM STRIP' },
      { x: 15500, name: 'CORAL FIELD' }
    ],
    birds: 8,
    gusts: false,
    fuel: 100,
    parcel: false,
    timeLimit: 0,
    briefing: 'Two island strips, one valley. Land slow, level and on the tarmac — a hard touchdown writes the plane off.'
  },
  {
    id: 3, key: '3',
    name: 'STORM COURIER',
    tag: 'Deliver the parcel through the storm on a short tank.',
    seed: 991126,
    length: 15000,
    rings: 5,
    stops: [
      { x: 14200, name: 'STORM FIELD' }
    ],
    birds: 12,
    gusts: true,
    fuel: 62,
    parcel: true,
    timeLimit: 0,
    briefing: 'A storm is rolling down the valley and the tank is short. Ride the gusts, dodge the birds, put the parcel down soft.'
  }
];

Meridian.newRun = function newRun(mission) {
  return {
    mission: mission,
    score: 0,
    ringsTaken: 0,
    landings: 0,
    landedStrips: {},
    elapsed: 0,
    status: 'flying',   // flying | won | lost
    endReason: '',
    bonus: 0,
    bestStreak: 0
  };
};

/* Points for a ring: base plus a speed bonus for threading it fast
   and clean, minus nothing — rings reward flying well, not rushing. */
Meridian.collectRings = function collectRings(run, plane, world) {
  var got = 0;
  for (var i = 0; i < world.rings.length; i++) {
    var ring = world.rings[i];
    if (ring.taken) continue;
    var dx = ring.x - plane.x;
    var dy = ring.y - plane.y;
    if (dx * dx + dy * dy < (ring.r + 14) * (ring.r + 14)) {
      ring.taken = true;
      run.ringsTaken++;
      var speedBonus = Math.round(Math.max(0, (plane.vx - 40)) * 4);
      var pts = 500 + speedBonus;
      run.score += pts;
      run.bestStreak++;
      got = pts;
    }
  }
  return got;
};

/* Called on a 'landed' event: score the touchdown and check the win. */
Meridian.onLanded = function onLanded(run, plane, world) {
  var pad = Meridian.runwayAt(plane.x, world.runways);
  if (!pad) return 0;
  if (world.runways.indexOf(pad) === 0) {
    // Touching down back on the home field scores nothing: it is where
    // every sortie starts, and the plane begins the game parked there.
    return 0;
  }
  var pts = 0;
  if (run.landedStrips[pad.name]) {
    // touching down twice on the same strip scores nothing extra
    return 0;
  }
  run.landedStrips[pad.name] = true;
  run.landings++;
  var softness = Math.round(1000 - Math.abs(plane.vy) * 90 - Math.abs(plane.pitch) * 12);
  if (softness < 250) softness = 250;
  pts = softness;
  run.score += pts;
  if (run.mission.parcel && world.parcel) {
    world.parcel.delivered = true;
    pts += 1200;
    run.score += 1200;
  }
  return pts;
};

/* Win / loss verdict, checked every frame. */
Meridian.checkVerdict = function checkVerdict(run, plane, world) {
  var m = run.mission;
  if (run.status !== 'flying') return run.status;
  if (plane.crashed) {
    run.status = 'lost';
    run.endReason = plane.damage >= 100
      ? 'Airframe written off — the valley keeps another plane.'
      : 'Crashed out.';
    return run.status;
  }
  if (m.id === 1 && run.ringsTaken >= m.rings) {
    run.status = 'won';
    run.endReason = 'All 8 rings threaded — a clean run over the valley.';
  } else if (m.id === 2 && run.landings >= m.stops.length) {
    run.status = 'won';
    run.endReason = 'Both island strips kissed — the hop is complete.';
  } else if (m.id === 3 && world.parcel && world.parcel.delivered) {
    run.status = 'won';
    run.endReason = 'Parcel delivered through the storm. The valley owes you one.';
  }
  if (run.status === 'won') {
    run.bonus = Math.round(plane.fuel * 8) + Math.max(0, 100 - Math.round(run.elapsed)) * 5;
    run.score += run.bonus;
  }
  if (run.status === 'flying' && plane.fuel <= 0 && plane.onGround === false
      && plane.vx < 8 && plane.y - Meridian.groundAt(plane.x, world) < 60) {
    // Out of fuel and sinking with no speed left: the sortie is over.
    run.status = 'lost';
    run.endReason = 'Out of fuel, out of sky — the plane came down in the scrub.';
  }
  return run.status;
};

/* One-line objective for the HUD. */
Meridian.objectiveText = function objectiveText(run, world) {
  var m = run.mission;
  if (m.id === 1) return 'RINGS ' + run.ringsTaken + '/' + m.rings;
  if (m.id === 2) return 'LANDINGS ' + run.landings + '/' + m.stops.length;
  if (m.id === 3) {
    return world.parcel && world.parcel.delivered ? 'PARCEL DELIVERED' : 'DELIVER THE PARCEL';
  }
  return '';
};
