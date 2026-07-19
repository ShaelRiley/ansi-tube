class AnsiTubeAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bitCrushMode = "off";
    this.pitchShift = 0;
    this.envelope = 0;
    this.gateOpen = false;
    this.gateGain = 0;
    this.holdCounters = [];
    this.heldSamples = [];
    this.pitchBuffers = [];
    this.writeIndex = 0;
    this.pitchPhase = 0.25;
    this.port.onmessage = (event) => {
      if (event.data?.type !== "settings") return;
      this.bitCrushMode = ["bit1", "bit2"].includes(event.data.bitCrushMode) ? event.data.bitCrushMode : "off";
      this.pitchShift = Math.max(-4, Math.min(4, Number(event.data.pitchShift) || 0));
    };
  }

  ensureChannels(count) {
    while (this.heldSamples.length < count) {
      this.heldSamples.push(0);
      this.holdCounters.push(0);
      this.pitchBuffers.push(new Float32Array(8192));
    }
  }

  quantize(sample, levels) {
    return Math.round(Math.max(-1, Math.min(1, sample)) * levels) / levels;
  }

  crush(sample, channel) {
    if (this.bitCrushMode === "off") return sample;
    const holdLength = this.bitCrushMode === "bit1" ? 4 : 6;
    if (this.holdCounters[channel] <= 0) {
      if (this.bitCrushMode === "bit1") {
        this.heldSamples[channel] = this.quantize(sample, 32);
      } else {
        const mu = 31;
        const sign = sample < 0 ? -1 : 1;
        const companded = sign * Math.log1p(mu * Math.abs(sample)) / Math.log1p(mu);
        const quantized = this.quantize(companded, 15);
        this.heldSamples[channel] = Math.sign(quantized) * Math.expm1(Math.abs(quantized) * Math.log1p(mu)) / mu;
      }
      this.holdCounters[channel] = holdLength;
    }
    this.holdCounters[channel] -= 1;
    return this.heldSamples[channel];
  }

  readPitch(buffer, position) {
    const length = buffer.length;
    while (position < 0) position += length;
    position %= length;
    const first = Math.floor(position);
    const next = (first + 1) % length;
    const mix = position - first;
    return buffer[first] + (buffer[next] - buffer[first]) * mix;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output?.length) return true;
    this.ensureChannels(output.length);
    const frames = output[0].length;
    const pitchEnabled = this.pitchShift !== 0;
    const ratio = Math.pow(2, this.pitchShift / 12);
    const pitchWindow = 2048;
    const phaseStep = (1 - ratio) / pitchWindow;
    const attack = Math.exp(-1 / (0.002 * sampleRate));
    const release = Math.exp(-1 / (0.085 * sampleRate));
    const gateAttack = Math.exp(-1 / (0.004 * sampleRate));
    const gateRelease = Math.exp(-1 / (0.028 * sampleRate));

    for (let frame = 0; frame < frames; frame += 1) {
      let peak = 0;
      for (let channel = 0; channel < input.length; channel += 1) {
        peak = Math.max(peak, Math.abs(input[channel]?.[frame] || 0));
      }
      const envelopeCoefficient = peak > this.envelope ? attack : release;
      this.envelope = envelopeCoefficient * this.envelope + (1 - envelopeCoefficient) * peak;
      if (this.bitCrushMode === "bit1") {
        if (this.gateOpen && this.envelope < 0.008) this.gateOpen = false;
        else if (!this.gateOpen && this.envelope > 0.014) this.gateOpen = true;
      } else {
        this.gateOpen = true;
      }
      const gateTarget = this.gateOpen ? 1 : 0;
      const gateCoefficient = gateTarget > this.gateGain ? gateAttack : gateRelease;
      this.gateGain = gateCoefficient * this.gateGain + (1 - gateCoefficient) * gateTarget;

      for (let channel = 0; channel < output.length; channel += 1) {
        const sourceChannel = input[channel] || input[0];
        const raw = sourceChannel?.[frame] || 0;
        let processed = this.crush(raw, channel);
        if (this.bitCrushMode === "bit1") processed *= this.gateGain;

        const buffer = this.pitchBuffers[channel];
        buffer[this.writeIndex] = processed;
        if (pitchEnabled) {
          const phaseA = this.pitchPhase;
          const phaseB = (phaseA + 0.5) % 1;
          const delayA = 64 + phaseA * pitchWindow;
          const delayB = 64 + phaseB * pitchWindow;
          const tapA = this.readPitch(buffer, this.writeIndex - delayA);
          const tapB = this.readPitch(buffer, this.writeIndex - delayB);
          const weightA = 0.5 - 0.5 * Math.cos(2 * Math.PI * phaseA);
          output[channel][frame] = tapA * weightA + tapB * (1 - weightA);
        } else {
          output[channel][frame] = processed;
        }
      }

      this.writeIndex = (this.writeIndex + 1) % this.pitchBuffers[0].length;
      if (pitchEnabled) {
        this.pitchPhase += phaseStep;
        while (this.pitchPhase < 0) this.pitchPhase += 1;
        while (this.pitchPhase >= 1) this.pitchPhase -= 1;
      }
    }
    return true;
  }
}

registerProcessor("ansi-tube-audio", AnsiTubeAudioProcessor);

