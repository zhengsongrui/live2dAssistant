// F5-TTS 合成服务：调用官方 POST /tts 接口，用内置 fetch（同 tts-example.js，无需 axios）
import { ttsConfig } from "../../config/tts.js";
import { numToChinese } from "../../utils/numToChinese.js";

/**
 * 合成语音
 * @param {string} text 要合成的文本
 * @param {object} [options] voice 音色 / speed 语速 / seed 随机种子 / removeSilence 去静音
 * @returns {Promise<Buffer>} 音频数据
 */
export async function synthesize(text, options = {}) {
  console.log(numToChinese(text))
  const res = await fetch(`${ttsConfig.baseURL}${ttsConfig.apiPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voice: options.voice ?? ttsConfig.voice,                    // 音色，见 server/voices.yaml
      text: numToChinese(text),                                   // 数字转中文，避免读成英文
      speed: options.speed ?? 1.0,                                // 语速
      remove_silence: options.removeSilence ?? ttsConfig.removeSilence, // 去多余静音
      ...(options.seed !== undefined && { seed: options.seed }),  // 传数字固定结果（可选）
    }),
    signal: AbortSignal.timeout(ttsConfig.timeout),
  });

  if (!res.ok) throw new Error(`F5-TTS 合成失败: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
