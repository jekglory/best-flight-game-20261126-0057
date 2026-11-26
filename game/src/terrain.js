/* Meridian Run — terrain: one seeded world per mission.
   A deterministic height field (layered sines from a mulberry32 seed),
   flat runway pads, ring gates, clouds, birds and trees. Nothing here
   reads the network or the clock: the same seed always builds the
   same valley, so screenshots and self-tests are reproducible. */
'use strict';

var Meridian = window.Meridian || (window.Meridian = {});

Meridian.mulberry32 = function mulberry32(seed) {
  var a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* Height of the ground in metres at world x (metres). Gentle rolling
   hills that rise toward the far end of each mission leg. */
Meridian.groundHeight = function groundHeight(x, seed) {
  var s1 = Math.sin(x * 0.00042 + seed * 1.7) * 26;
  var s2 = Math.sin(x * 0.00110 + seed * 3.1) * 14;
  var s3 = Math.sin(x * 0.00260 + seed * 5.3) * 6;
  var climb = Math.max(0, (x - 9000) / 9000) * 55;
  return 34 + s1 + s2 + s3 + climb;
};

/* Flat pads where a runway sits: the ground is levelled inside them. */
Meridian.runwayAt = function runwayAt(x, runways) {
  for (var i = 0; i < runways.length; i++) {
    var r = runways[i];
    if (x >= r.x - r.half && x <= r.x + r.half) return r;
  }
  return null;
};

Meridian.groundAt = function groundAt(x, world) {
  var pad = Meridian.runwayAt(x, world.runways);
  if (pad) return pad.ground;
  return Meridian.groundHeight(x, world.seed);
};

/* Build a whole world: runways, ring gates, clouds, birds, trees. */
Meridian.buildWorld = function buildWorld(mission) {
  var rnd = Meridian.mulberry32(mission.seed);
  var world = {
    seed: mission.seed,
    length: mission.length,
    runways: [],
    rings: [],
    clouds: [],
    birds: [],
    trees: [],
    parcel: null
  };
  // Home strip at the start, then one strip per landing stop.
  var home = { x: 350, half: 260, ground: Meridian.groundHeight(350, mission.seed), name: 'MERIDIAN FIELD' };
  world.runways.push(home);
  for (var s = 0; s < mission.stops.length; s++) {
    var stop = mission.stops[s];
    var gx = stop.x;
    var g = Meridian.groundHeight(gx, mission.seed);
    world.runways.push({ x: gx, half: 260, ground: g, name: stop.name });
  }
  // Ring gates spaced along the leg, alternating high and low.
  for (var i = 0; i < mission.rings; i++) {
    var t = (i + 1) / (mission.rings + 1);
    var rx = 1200 + t * (mission.length - 2400);
    var base = Meridian.groundHeight(rx, mission.seed);
    var alt = base + (i % 2 === 0 ? 150 + rnd() * 60 : 90 + rnd() * 50);
    world.rings.push({ x: rx, y: alt, r: 42, taken: false, index: i });
  }
  // Clouds drift slowly; birds patrol fixed stretches.
  for (var c = 0; c < 26; c++) {
    world.clouds.push({
      x: rnd() * mission.length,
      y: 320 + rnd() * 260,
      s: 0.7 + rnd() * 1.1,
      drift: 2 + rnd() * 4
    });
  }
  for (var b = 0; b < mission.birds; b++) {
    var bx = 2500 + rnd() * (mission.length - 5000);
    world.birds.push({
      x0: bx, span: 500 + rnd() * 700,
      y: 130 + rnd() * 160, phase: rnd() * Math.PI * 2,
      speed: 0.25 + rnd() * 0.3, flap: 0
    });
  }
  for (var tr = 0; tr < 420; tr++) {
    var tx = rnd() * mission.length;
    if (Meridian.runwayAt(tx, world.runways)) continue;
    world.trees.push({ x: tx, h: 9 + rnd() * 12, kind: (rnd() * 3) | 0 });
  }
  if (mission.parcel) {
    world.parcel = { x: mission.length - 700, y: 0, carried: false, delivered: false };
  }
  return world;
};

/* Bird position at time t (seconds): a slow sine patrol. */
Meridian.birdAt = function birdAt(bird, t) {
  return {
    x: bird.x0 + Math.sin(t * bird.speed + bird.phase) * bird.span,
    y: bird.y + Math.sin(t * 1.7 + bird.phase * 2) * 14,
    flap: Math.sin(t * 9 + bird.phase * 5)
  };
};
