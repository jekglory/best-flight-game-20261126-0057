/* Meridian Run — sound: everything is synthesised with WebAudio, no
   audio files. A low engine drone follows the throttle, a chime marks
   a ring, a soft major arpeggio marks a landing, and a noise burst
   marks a crash. Sound starts on the first user gesture. */
'use strict';

var Meridian = window.Meridian || (window.Meridian = {});

Meridian.newAudio = function newAudio() {
  return {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    windGain: null,
    windSrc: null,
    started: false
  };
};

Meridian.audioUnlock = function audioUnlock(audio) {
  if (audio.started) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ctx = new AC();
    audio.started = true;
    // engine drone: two detuned saws through a low-pass filter
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 62;
    var osc2 = audio.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 93;
    var filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(filter);
    osc2.connect(filter);
    filter.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engineOsc.start();
    osc2.start();
    audio._osc2 = osc2;
    audio._filter = filter;
    // wind: looped filtered noise
    var len = audio.ctx.sampleRate * 2;
    var buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    audio.windSrc = audio.ctx.createBufferSource();
    audio.windSrc.buffer = buf;
    audio.windSrc.loop = true;
    var windFilter = audio.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    audio.windGain = audio.ctx.createGain();
    audio.windGain.gain.value = 0;
    audio.windSrc.connect(windFilter);
    windFilter.connect(audio.windGain);
    audio.windGain.connect(audio.ctx.destination);
    audio.windSrc.start();
  } catch (e) {
    audio.ctx = null;
  }
};

Meridian.audioTick = function audioTick(audio, plane) {
  if (!audio.ctx || audio.muted) {
    if (audio.engineGain) audio.engineGain.gain.value = 0;
    if (audio.windGain) audio.windGain.gain.value = 0;
    return;
  }
  var thr = plane.throttle;
  var target = plane.crashed ? 0 : 0.035 + thr * 0.05;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  var freq = 52 + thr * 46 + plane.vx * 0.35;
  audio.engineOsc.frequency.setTargetAtTime(freq, audio.ctx.currentTime, 0.1);
  audio._osc2.frequency.setTargetAtTime(freq * 1.5, audio.ctx.currentTime, 0.1);
  var wind = Math.min(0.06, plane.vx * 0.0006);
  audio.windGain.gain.setTargetAtTime(wind, audio.ctx.currentTime, 0.2);
};

Meridian.audioTone = function audioTone(audio, freq, dur, type, vol, when) {
  if (!audio.ctx || audio.muted) return;
  var t0 = audio.ctx.currentTime + (when || 0);
  var osc = audio.ctx.createOscillator();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  var g = audio.ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol || 0.16, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(audio.ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
};

Meridian.audioRing = function audioRing(audio) {
  Meridian.audioTone(audio, 880, 0.35, 'sine', 0.2, 0);
  Meridian.audioTone(audio, 1318, 0.45, 'sine', 0.16, 0.07);
};

Meridian.audioLand = function audioLand(audio) {
  var notes = [523, 659, 784, 1046];
  for (var i = 0; i < notes.length; i++) {
    Meridian.audioTone(audio, notes[i], 0.5, 'triangle', 0.16, i * 0.09);
  }
};

Meridian.audioWin = function audioWin(audio) {
  var notes = [523, 659, 784, 1046, 1318];
  for (var i = 0; i < notes.length; i++) {
    Meridian.audioTone(audio, notes[i], 0.6, 'triangle', 0.16, i * 0.11);
  }
};

Meridian.audioCrash = function audioCrash(audio) {
  if (!audio.ctx || audio.muted) return;
  var len = audio.ctx.sampleRate * 0.5;
  var buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = audio.ctx.createBufferSource();
  src.buffer = buf;
  var filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  var g = audio.ctx.createGain();
  g.gain.value = 0.5;
  src.connect(filter);
  filter.connect(g);
  g.connect(audio.ctx.destination);
  src.start();
  Meridian.audioTone(audio, 70, 0.5, 'sine', 0.3, 0);
};

Meridian.audioBird = function audioBird(audio) {
  Meridian.audioTone(audio, 2400, 0.12, 'square', 0.05, 0);
  Meridian.audioTone(audio, 1900, 0.12, 'square', 0.05, 0.1);
};
