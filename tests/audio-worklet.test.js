const assert = require("node:assert/strict");

let RegisteredProcessor;
global.sampleRate = 48000;
global.AudioWorkletProcessor = class AudioWorkletProcessor {
  constructor() { this.port = { onmessage: null }; }
};
global.registerProcessor = (name, processor) => {
  assert.equal(name, "ansi-tube-audio");
  RegisteredProcessor = processor;
};

require("../audio-worklet.js");
assert(RegisteredProcessor);

function render(processor, samples) {
  const input = [Float32Array.from(samples), Float32Array.from(samples)];
  const output = [new Float32Array(samples.length), new Float32Array(samples.length)];
  assert.equal(processor.process([input], [output]), true);
  return output;
}

const processor = new RegisteredProcessor();
const transparentInput = Array.from({ length: 512 }, (_, index) => Math.sin(index * 0.073) * 0.37);
const transparentOutput = render(processor, transparentInput);
assert.deepEqual([...transparentOutput[0]], [...Float32Array.from(transparentInput)], "Worklet defaults must be bit-perfect when crush and pitch are off");
assert.deepEqual([...transparentOutput[1]], [...Float32Array.from(transparentInput)], "Every bypassed channel must remain bit-perfect");

processor.port.onmessage({ data: { type: "settings", bitCrushMode: "bit1", pitchShift: 0 } });
const silence = render(processor, new Array(128).fill(0));
assert(silence.every((channel) => channel.every((sample) => sample === 0)), "Bit Crush 1 must not inject noise into silence");

const speechLike = Array.from({ length: 4096 }, (_, index) => Math.sin(index * 0.12) * 0.35);
const crushed1 = render(processor, speechLike)[0];
assert(crushed1.some((sample) => sample !== 0));
assert(crushed1.every(Number.isFinite));

processor.port.onmessage({ data: { type: "settings", bitCrushMode: "bit2", pitchShift: 0 } });
const crushed2 = render(processor, speechLike)[0];
assert(crushed2.every(Number.isFinite));
assert.notDeepEqual([...crushed1.slice(-128)], [...crushed2.slice(-128)], "The two bit-crush modes should have distinct transfer functions");

processor.port.onmessage({ data: { type: "settings", bitCrushMode: "off", pitchShift: 3 } });
const pitched = render(processor, speechLike)[0];
assert(pitched.every(Number.isFinite));

processor.port.onmessage({ data: { type: "settings", bitCrushMode: "off", pitchShift: 0 } });
const restoredBypass = render(processor, transparentInput)[0];
assert.deepEqual([...restoredBypass], [...Float32Array.from(transparentInput)], "Turning processing off must restore a bit-perfect worklet path");

console.log("ANSI Tube audio-worklet tests passed.");
