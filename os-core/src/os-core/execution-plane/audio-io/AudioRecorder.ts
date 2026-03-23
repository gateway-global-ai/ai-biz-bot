import { int16ToBase64 } from "./pcmUtils";

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;

  async start(onChunk: (base64PCM: string) => void): Promise<void> {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Audio recording is not supported in this environment.");
    }

    this.audioContext = new AudioContextCtor();
    if (!("audioWorklet" in this.audioContext)) {
      throw new Error("AudioWorklet is not supported in this environment.");
    }

    await this.audioContext.audioWorklet.addModule(
      new URL("./recorder-worklet.js", import.meta.url)
    );
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      "gatewayglobal-recorder-worklet",
      {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
        processorOptions: {
          inputSampleRate: this.audioContext.sampleRate,
          outputSampleRate: 16000,
          chunkSize: 320,
        },
      }
    );

    this.workletNode.port.onmessage = (event: MessageEvent) => {
      const pcmBuffer = event.data?.pcm16;
      if (!(pcmBuffer instanceof ArrayBuffer)) {
        return;
      }

      onChunk(int16ToBase64(new Int16Array(pcmBuffer)));
    };

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.sourceNode.connect(this.workletNode);
  }

  async stop(): Promise<void> {
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }

    this.workletNode = null;
    this.sourceNode = null;
    this.mediaStream = null;
    this.audioContext = null;
  }
}
