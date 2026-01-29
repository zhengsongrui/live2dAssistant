import { exec } from "child_process";
import path from "path";

const WHISPER_EXE = path.resolve("whisper/whisper-cli.exe");
const MODEL_PATH = path.resolve("whisper/models/ggml-base.bin");

export function transcribe(wavPath) {
  return new Promise((resolve, reject) => {
    const cmd = `"${WHISPER_EXE}" -m "${MODEL_PATH}" -f "${wavPath}" -l zh -nt`;

    exec(cmd, { windowsHide: true }, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}
