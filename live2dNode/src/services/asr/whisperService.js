import { exec } from "child_process";
import { whisperConfig } from "../../config/whisper.js";

/**
 * 使用本地 whisper-cli 对音频文件进行中文语音识别
 * @param {string} audioPath 音频文件绝对路径
 * @returns {Promise<string>} 识别出的文本
 */
export function transcribe(audioPath) {
  return new Promise((resolve, reject) => {
    const cmd = `"${whisperConfig.exePath}" -m "${whisperConfig.modelPath}" -f "${audioPath}" -l ${whisperConfig.language} -nt`;

    exec(cmd, { windowsHide: true }, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}
