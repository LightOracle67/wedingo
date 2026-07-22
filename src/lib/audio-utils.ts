const TARGET_SAMPLE_RATE = 11025;
const MAX_DURATION_SEC = 20;

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export async function compressAudio(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  const duration = audioBuffer.duration;
  const renderDuration = Math.min(duration, MAX_DURATION_SEC);
  const renderSamples = Math.ceil(renderDuration * TARGET_SAMPLE_RATE);
  const offsetSamples = duration > MAX_DURATION_SEC
    ? Math.floor((duration - MAX_DURATION_SEC) / 2 * audioBuffer.sampleRate)
    : 0;

  const offlineCtx = new OfflineAudioContext({
    numberOfChannels: 1,
    length: renderSamples,
    sampleRate: TARGET_SAMPLE_RATE,
  });

  const source = offlineCtx.createBufferSource();
  const origBuffer = audioBuffer;
  const offlineBuffer = offlineCtx.createBuffer(
    1, renderSamples, TARGET_SAMPLE_RATE,
  );
  const outputData = offlineBuffer.getChannelData(0);

  const numChannels = origBuffer.numberOfChannels;
  const origDuration = Math.min(duration, MAX_DURATION_SEC);
  const readLen = Math.min(
    origDuration * origBuffer.sampleRate,
    origBuffer.length - offsetSamples,
  );
  for (let j = 0; j < readLen; j++) {
    let sample = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sample += origBuffer.getChannelData(ch)[j + offsetSamples] || 0;
    }
    outputData[j] = sample / numChannels;
  }

  source.buffer = offlineBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  const rendered = await offlineCtx.startRendering();
  const pcmData = rendered.getChannelData(0);
  const wavBuffer = encodeWav(pcmData, TARGET_SAMPLE_RATE);

  const bytes = new Uint8Array(wavBuffer);
  const chunkSize = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  const binary = chunks.join("");
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function estimateAudioSize(durationSec: number): number {
  const capped = Math.min(durationSec, MAX_DURATION_SEC);
  const rawBytes = TARGET_SAMPLE_RATE * 2 * capped + 44;
  return Math.round(rawBytes * 4 / 3);
}
