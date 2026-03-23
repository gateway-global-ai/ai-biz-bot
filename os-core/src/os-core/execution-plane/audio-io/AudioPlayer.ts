import { base64ToInt16, int16ToFloat32Buffer } from "./pcmUtils";

interface QueuedAudioChunk {
  sequenceNumber: number;
  audioBuffer: AudioBuffer;
  durationMs: number;
}

export interface AudioPlaybackTelemetry {
  isBuffering: boolean;
  isPlaying: boolean;
  bufferedMs: number;
}

interface AudioPlayerOptions {
  prebufferMs?: number;
  resumeBufferMs?: number;
  onTelemetryChange?: (telemetry: AudioPlaybackTelemetry) => void;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private readonly prebufferMs: number;
  private readonly resumeBufferMs: number;
  private readonly onTelemetryChange?: (telemetry: AudioPlaybackTelemetry) => void;
  private queuedChunks: QueuedAudioChunk[] = [];
  private nextArrivalSequence = 0;
  private expectedSequence: number | null = null;
  private playbackLoopActive = false;
  private bufferedMs = 0;
  private streamComplete = false;
  private telemetry: AudioPlaybackTelemetry = {
    isBuffering: false,
    isPlaying: false,
    bufferedMs: 0,
  };

  constructor(options: AudioPlayerOptions = {}) {
    this.prebufferMs = options.prebufferMs ?? 100;
    this.resumeBufferMs = options.resumeBufferMs ?? 60;
    this.onTelemetryChange = options.onTelemetryChange;
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("Audio playback is not supported in this environment.");
      }
      this.audioContext = new AudioContextCtor();
    }
    return this.audioContext;
  }

  async enqueueBase64PCM(
    base64PCM: string,
    sampleRate = 16000,
    sequenceNumber?: number
  ): Promise<void> {
    const context = this.getContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    this.streamComplete = false;

    const pcm16 = base64ToInt16(base64PCM);
    const float32 = int16ToFloat32Buffer(pcm16);
    const audioBuffer = context.createBuffer(1, float32.length, sampleRate);
    audioBuffer.copyToChannel(float32, 0);

    const resolvedSequence = sequenceNumber ?? this.nextArrivalSequence++;
    const queuedChunk: QueuedAudioChunk = {
      sequenceNumber: resolvedSequence,
      audioBuffer,
      durationMs: audioBuffer.duration * 1000,
    };

    const insertIndex = this.queuedChunks.findIndex(
      (chunk) => chunk.sequenceNumber > resolvedSequence
    );
    if (insertIndex === -1) {
      this.queuedChunks.push(queuedChunk);
    } else {
      this.queuedChunks.splice(insertIndex, 0, queuedChunk);
    }

    this.bufferedMs += queuedChunk.durationMs;
    if (this.expectedSequence === null) {
      this.expectedSequence = this.queuedChunks[0]?.sequenceNumber ?? resolvedSequence;
    }

    const threshold = this.telemetry.isPlaying ? this.resumeBufferMs : this.prebufferMs;
    if (this.bufferedMs < threshold) {
      this.emitTelemetry({ isBuffering: true, bufferedMs: this.bufferedMs });
      return;
    }

    void this.maybeStartPlaybackLoop();
  }

  markStreamComplete(): void {
    this.streamComplete = true;
    if (!this.telemetry.isPlaying && this.bufferedMs === 0) {
      this.emitTelemetry({ isBuffering: false, bufferedMs: 0 });
    }
  }

  private emitTelemetry(partial: Partial<AudioPlaybackTelemetry>): void {
    this.telemetry = {
      ...this.telemetry,
      ...partial,
      bufferedMs: partial.bufferedMs ?? this.bufferedMs,
    };
    this.onTelemetryChange?.(this.telemetry);
  }

  private async maybeStartPlaybackLoop(): Promise<void> {
    if (this.playbackLoopActive) {
      return;
    }

    this.playbackLoopActive = true;
    try {
      await this.playbackLoop();
    } finally {
      this.playbackLoopActive = false;
    }
  }

  private takeNextChunk(): QueuedAudioChunk | null {
    if (this.queuedChunks.length === 0) {
      return null;
    }

    if (this.expectedSequence === null) {
      this.expectedSequence = this.queuedChunks[0].sequenceNumber;
    }

    const exactMatchIndex = this.queuedChunks.findIndex(
      (chunk) => chunk.sequenceNumber === this.expectedSequence
    );

    if (exactMatchIndex === -1) {
      return null;
    }

    const [chunk] = this.queuedChunks.splice(exactMatchIndex, 1);
    this.expectedSequence = chunk.sequenceNumber + 1;
    this.bufferedMs = Math.max(0, this.bufferedMs - chunk.durationMs);
    return chunk;
  }

  private async playbackLoop(): Promise<void> {
    while (true) {
      const nextChunk = this.takeNextChunk();
      if (!nextChunk) {
        this.emitTelemetry({
          isPlaying: false,
          isBuffering: !this.streamComplete,
          bufferedMs: this.bufferedMs,
        });
        return;
      }

      this.emitTelemetry({
        isPlaying: true,
        isBuffering: false,
        bufferedMs: this.bufferedMs,
      });

      const source = this.getContext().createBufferSource();
      source.buffer = nextChunk.audioBuffer;
      source.connect(this.getContext().destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });

      const hasEnoughToContinue = this.bufferedMs >= this.resumeBufferMs;
      if (!hasEnoughToContinue && !this.streamComplete) {
        this.emitTelemetry({
          isPlaying: false,
          isBuffering: true,
          bufferedMs: this.bufferedMs,
        });
        return;
      }
    }
  }

  async dispose(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.queuedChunks = [];
    this.expectedSequence = null;
    this.playbackLoopActive = false;
    this.bufferedMs = 0;
    this.streamComplete = false;
    this.telemetry = {
      isBuffering: false,
      isPlaying: false,
      bufferedMs: 0,
    };
    this.onTelemetryChange?.(this.telemetry);
  }
}
