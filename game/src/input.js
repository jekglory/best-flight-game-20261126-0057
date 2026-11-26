/* Meridian Run — input: keyboard and mouse, one small state object.
   Keys: arrows / WASD for pitch and throttle, Space airbrake,
   Shift boost, F flaps, P pause, M mute, 1/2/3 mission select,
   Enter start. Mouse move steers pitch toward the cursor height,
   wheel sets throttle, click boosts while held. */
'use strict';

var Meridian = window.Meridian || (window.Meridian = {});

Meridian.newInput = function newInput() {
  return {
    pitchUp: false,
    pitchDown: false,
    throttleUp: false,
    throttleDown: false,
    airbrake: false,
    boost: false,
    flaps: false,
    mouseSteer: false,
    mousePitch: 0,
    mouseThrottle: null,
    pressed: {},   // edge-triggered keys, consumed by the loop
    canvasY: 400
  };
};

Meridian.bindInput = function bindInput(input, canvas, onFirstGesture) {
  var keys = {};
  var codeMap = {
    ArrowUp: 'pitchUp', KeyW: 'pitchUp',
    ArrowDown: 'pitchDown', KeyS: 'pitchDown',
    ArrowRight: 'throttleUp', KeyD: 'throttleUp',
    ArrowLeft: 'throttleDown', KeyA: 'throttleDown',
    Space: 'airbrake',
    ShiftLeft: 'boost', ShiftRight: 'boost',
    KeyF: 'flaps'
  };
  function gesture() {
    if (onFirstGesture) onFirstGesture();
  }
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    gesture();
    var name = codeMap[e.code];
    if (name) {
      input[name] = true;
      keys[e.code] = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyP' || e.code === 'KeyM' || e.code === 'Enter' ||
        e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' ||
        e.code === 'KeyR') {
      input.pressed[e.code] = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) {
    var name = codeMap[e.code];
    if (name) {
      input[name] = false;
      keys[e.code] = false;
    }
  });
  window.addEventListener('blur', function () {
    for (var k in codeMap) input[codeMap[k]] = false;
  });

  canvas.addEventListener('mousemove', function (e) {
    gesture();
    var rect = canvas.getBoundingClientRect();
    var y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.canvasY = y;
    input.mouseSteer = true;
    // Cursor above centre = nose up. Dead zone in the middle third.
    var dy = (400 - y) / 400;
    input.mousePitch = Math.max(-1, Math.min(1, dy * 1.6));
    if (Math.abs(dy) < 0.12) input.mousePitch = 0;
  });
  canvas.addEventListener('mouseleave', function () {
    input.mouseSteer = false;
    input.mousePitch = 0;
  });
  canvas.addEventListener('mousedown', function (e) {
    gesture();
    input.boost = true;
    e.preventDefault();
  });
  window.addEventListener('mouseup', function () {
    input.boost = false;
  });
  canvas.addEventListener('wheel', function (e) {
    gesture();
    var delta = e.deltaY < 0 ? 0.12 : -0.12;
    if (input.mouseThrottle === null) input.mouseThrottle = 0.55;
    input.mouseThrottle = Math.max(0, Math.min(1, input.mouseThrottle + delta));
    e.preventDefault();
  }, { passive: false });

  return keys;
};
