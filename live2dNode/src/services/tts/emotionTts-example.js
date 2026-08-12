// IndexTTS2 HTTP API 调用示例（Node.js，用内置 fetch，无需额外依赖）
// 运行：node tts-example.js
//
// 本示例演示 POST /tts 的「全部参数」，重点是情感控制，共三种方式（互斥）：
//   1) 参考音频情感：emo_audio_prompt + emo_alpha
//   2) 情感向量：emo_vector（8 维）+ emo_alpha
//   3) 文本情感：use_emo_text + emo_text（由内置 QwenEmotion 自动推断）
// 注意：方式 2/3 生效时，方式 1 的 emo_audio_prompt 会被服务端自动忽略。
//
// 用环境变量 EMOTION_MODE=1/2/3 切换（默认 3，文本情感最直观）：
//   node tts-example.js                 # 方式 3：文本情感
//   EMOTION_MODE=2 node tts-example.js  # 方式 2：情感向量
//   EMOTION_MODE=1 node tts-example.js  # 方式 1：参考音频
const fs = require("fs");

const EMOTION_MODE = Number(process.env.EMOTION_MODE || 3);

function buildEmotionBody() {
  if (EMOTION_MODE === 1) {
    // 方式 1：情感参考音频（voices.yaml 里的音色 id 或文件路径）
    return {
      emo_audio_prompt: "voice_07", // 情感参考音频（音色 id 或路径）
      emo_alpha: 0.65, // 0~1，越大情感越浓（0 完全用说话人，1 完全用情感参考）
    };
  }
  if (EMOTION_MODE === 2) {
    // 方式 2：8 维情感向量 [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]
    return {
      emo_vector: [0, 0, 0, 0, 0, 0, 0, 1], // 全部 0 + calm=1：自然、平静
      emo_alpha: 0.65, // 0~1，会整体缩放向量强度
    };
  }
  // 方式 3（默认）：文本情感，由 QwenEmotion 自动推断 8 维向量
  return {
    use_emo_text: true,
    emo_text: "低沉而悲伤地说话", // 情感描述；留空则自动使用主文本
  };
}

async function main() {
  const body = {
    voice: "malele_3", // 说话人音色 id，见 index-tts/voices.yaml（也支持文件路径）
    text: "今天天气真好，我们一起去公园散步吧。",
    speed: 1, // 语速倍率，1 为原速（非 1 走后处理变速）
    // seed: 42,             // 想固定结果就填一个数字（相同输入+种子 => 相同结果）
    remove_silence: true, // 去掉首尾静音
    format: "mp3", // wav / mp3 / ogg / flac（mp3 体积约为 wav 的 1/7）
    bitrate: 64, // 仅 mp3 有效，目标码率 kbps（32~128）

    // ---- 情感控制（重点）----
    ...buildEmotionBody(),

    // ---- 解码/生成参数（不传则用服务端默认值）----
    // do_sample: true,
    // top_p: 0.8,
    // top_k: 30,
    // temperature: 0.8,
    // length_penalty: 0.0,
    // num_beams: 3,
    // repetition_penalty: 10.0,
    // max_mel_tokens: 1500,

    // ---- 其它生成参数 ----
    // interval_silence: 200,            // 多段文本之间的静音毫秒数
    // max_text_tokens_per_segment: 120, // 每段最大文本 token
  };

  console.log("请求参数:", JSON.stringify(body, null, 2));

  const res = await fetch("http://127.0.0.1:8000/emotion-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("请求失败:", await res.text());
    return;
  }

  const contentType = res.headers.get("content-type");
  const buf = Buffer.from(await res.arrayBuffer());
  // 根据 Content-Type 决定扩展名
  const ext = /mpeg/.test(contentType)
    ? "mp3"
    : /ogg/.test(contentType)
    ? "ogg"
    : /flac/.test(contentType)
    ? "flac"
    : "wav";
  const file = `out.${ext}`;
  fs.writeFileSync(file, buf);
  console.log(`已保存 ${file}（${contentType}），共 ${buf.length} 字节`);
  // 体积对比提示：mp3 64kbps 约为同内容 24kHz 16bit WAV 的 1/7 左右
  if (ext !== "wav") {
    console.log(`提示：同内容存成 24kHz 16bit WAV 大约为 ${(buf.length * 7).toLocaleString()} 字节（约 ${Math.round((buf.length * 7) / buf.length)} 倍）`);
  }
}

main();
