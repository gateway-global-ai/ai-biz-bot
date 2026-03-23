class GatewayGlobalRecorderWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const processorOptions = options?.processorOptions ?? {};
    this.inputSampleRate = processorOptions.inputSampleRate ?? sampleRate;
    this.outputSampleRate = processorOptions.outputSampleRate ?? 16000;
    this.chunkSize = processorOptions.chunkSize ?? 320;
    this.pendingSamples = [];
  }

  downsample(input) {
    if (this.outputSampleRate >= this.inputSampleRate) {
      return input;
    }

    const ratio = this.inputSampleRate / this.outputSampleRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < output.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i += 1) {
        accum += input[i];
        count += 1;
      }

      output[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }

    return output;
  }

  float32ToInt16(value) {
    const clamped = Math.max(-1, Math.min(1, value));
    return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  flushChunks() {
    while (this.pendingSamples.length >= this.chunkSize) {
      const chunk = this.pendingSamples.splice(0, this.chunkSize);
      const pcm16 = new Int16Array(chunk.length);

      for (let i = 0; i < chunk.length; i += 1) {
        pcm16[i] = chunk[i];
      }

      this.port.postMessage(
        {
          type: "pcm-chunk",
          pcm16: pcm16.buffer,
        },
        [pcm16.buffer]
      );
    }
  }

  process(inputs) {
    const channelData = inputs[0]?.[0];
    if (!channelData?.length) {
      return true;
    }

    const downsampled = this.downsample(channelData);
    for (let i = 0; i < downsampled.length; i += 1) {
      this.pendingSamples.push(this.float32ToInt16(downsampled[i]));
    }

    this.flushChunks();
    return true;
  }
}

registerProcessor("gatewayglobal-recorder-worklet", GatewayGlobalRecorderWorklet);
