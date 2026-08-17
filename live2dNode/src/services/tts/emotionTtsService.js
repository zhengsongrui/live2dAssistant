// 语气（情感）语音合成服务：基于 IndexTTS2 的 emitionTts-example.js 请求模板
// 调用官方 POST /tts 接口，用内置 fetch（无额外依赖）
//
// 支持三种情感控制方式（互斥）：
//   1) 参考音频情感：emoAudioPrompt + emoAlpha
//   2) 情感向量：emoVector（8 维）+ emoAlpha
//   3) 文本情感：useEmoText + emoText（由内置 QwenEmotion 自动推断）
// 注意：方式 2/3 生效时，方式 1 的 emo_audio_prompt 会被服务端自动忽略。
import { ttsConfig } from "../../config/tts.js";
import { numToChinese } from "../../utils/numToChinese.js";
import { toSimplified } from "../../utils/toSimplified.js";
import { replaceRareChars } from "../../utils/replaceRareChars.js";

// 8 维情感向量各维度的含义（顺序固定，不可调换）
// [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]
export const EMOTION_VECTOR_LABELS = [
  "happy",
  "angry",
  "sad",
  "afraid",
  "disgusted",
  "melancholic",
  "surprised",
  "calm",
];

// 输出格式 -> HTTP Content-Type 映射
const FORMAT_CONTENT_TYPE = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

/**
 * 构造情感控制参数（对齐 emitionTts-example.js 的 buildEmotionBody）
 * @param {object} [emotion] 情感相关入参
 * @param {number} [emotion.emotionMode] 情感模式 1/2/3（默认取配置）
 * @param {number} [emotion.emoAlpha] 情感强度（方式 1/2，0~1）
 * @param {string} [emotion.emoAudioPrompt] 情感参考音频（方式 1，音色 id 或路径）
 * @param {number[]} [emotion.emoVector] 8 维情感向量（方式 2）
 * @param {string} [emotion.emoText] 情感描述（方式 3）
 * @returns {object} 情感控制参数片段
 */
function buildEmotionBody({ emotionMode, emoAlpha, emoAudioPrompt, emoVector, emoText } = {}) {
  const mode = Number(emotionMode ?? ttsConfig.emotion.defaultMode);
  const alpha = emoAlpha ?? ttsConfig.emotion.defaultAlpha;

  if (mode === 1) {
    // 方式 1：情感参考音频（音色 id 或文件路径）
    return {
      emo_audio_prompt: emoAudioPrompt ?? ttsConfig.emotion.defaultAudioPrompt,
      emo_alpha: alpha,
    };
  }
  if (mode === 2) {
    // 方式 2：8 维情感向量，未传时用默认向量（calm=1：自然、平静）
    return {
      emo_vector: Array.isArray(emoVector) ? emoVector : ttsConfig.emotion.defaultVector,
      emo_alpha: alpha,
    };
  }
  // 方式 3（默认）：文本情感，由 QwenEmotion 自动推断；未传 emoText 则使用主文本
  return {
    use_emo_text: true,
    ...(emoText ? { emo_text: emoText } : {}),
  };
}

/**
 * 语气语音合成
 * @param {string} text 要合成的文本
 * @param {object} [params]
 *   voice 音色 / speed 语速 / seed 随机种子 / removeSilence 去静音
 *   emotionMode 情感模式 1/2/3
 *   emoAudioPrompt 情感参考音频（方式 1）/ emoAlpha 情感强度（方式 1/2）
 *   emoVector 8 维情感向量（方式 2）/ emoText 情感描述（方式 3）
 *   format 输出格式 wav/mp3/ogg/flac / bitrate 目标码率（仅 mp3，32~128）
 * @returns {Promise<{ audio: Buffer, format: string, contentType: string }>}
 */
export async function synthesizeEmotion(
  text,
  {
    voice,
    speed,
    seed,
    removeSilence,
    format,
    bitrate,
    emotionMode,
    emoAudioPrompt,
    emoAlpha,
    emoVector,
    emoText,
  } = {}
) {
  const outputFormat = format ?? ttsConfig.emotion.defaultFormat;
  // 文本预处理：繁体 -> 简体，再生僻字 -> 同音字（IndexTTS2 无法识别繁体与生僻字）
  const textCn = replaceRareChars(toSimplified(text));
  const emoTextCn = emoText ? replaceRareChars(toSimplified(emoText)) : undefined;
  const body = {
    voice: voice ?? ttsConfig.voice,                // 说话人音色 id，见 voices.yaml（也支持文件路径）
    text: numToChinese(textCn),                     // 简体 + 数字转中文，避免读成英文
    speed: speed ?? 1,                              // 语速倍率，1 为原速（非 1 走后处理变速）
    remove_silence: removeSilence ?? ttsConfig.removeSilence, // 去掉首尾静音
    format: outputFormat,                           // wav / mp3 / ogg / flac
    ...(bitrate !== undefined && { bitrate }),      // 仅 mp3 有效（32~128）
    ...(seed !== undefined && { seed }),            // 固定结果（可选）

    // ---- 情感控制（重点）----
    ...buildEmotionBody({ emotionMode, emoAlpha, emoAudioPrompt, emoVector, emoText: emoTextCn }),
  };
  console.log(body)
  const res = await fetch(`${ttsConfig.baseURL}${ttsConfig.apiPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // 语气合成推理链路较长，超时放宽到 5 分钟（见 ttsConfig.emotion.timeout）
    signal: AbortSignal.timeout(ttsConfig.emotion.timeout),
  });

  if (!res.ok) throw new Error(`语气语音合成失败: ${res.status} ${await res.text()}`);
  return {
    audio: Buffer.from(await res.arrayBuffer()),
    format: outputFormat,
    contentType: FORMAT_CONTENT_TYPE[outputFormat] ?? "application/octet-stream",
  };
}
