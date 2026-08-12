// F5-TTS 服务配置，统一从环境变量读取
export const ttsConfig = {
  // F5-TTS 服务地址（demo 为 127.0.0.1:8000）
  baseURL: process.env.F5_TTS_URL || "http://localhost:8000",
  // 官方内置 FastAPI 合成接口（POST /tts）
  apiPath: "/tts",
  // 音色 id（见 F5-TTS 服务端 server/voices.yaml）
  voice: process.env.F5_TTS_VOICE || "malele_3",
  // 是否去掉合成音频中的多余静音
  removeSilence: true,
  // 合成可能较慢（首次需加载模型），超时放宽到 120s
  timeout: 120000,
  // 语气（情感）合成默认值，见 emitionTts-example.js（三种方式互斥）
  emotion: {
    // 默认情感模式：1=参考音频 / 2=情感向量 / 3=文本情感（QwenEmotion 自动推断）
    defaultMode: Number(process.env.F5_TTS_EMOTION_MODE || 3),
    // 方式 1 的默认情感参考音频（音色 id 或文件路径，见 voices.yaml）
    defaultAudioPrompt: process.env.F5_TTS_EMO_AUDIO || "voice_07",
    // 方式 1/2 的默认情感强度（0~1，越大情感越浓）
    defaultAlpha: Number(process.env.F5_TTS_EMO_ALPHA || 0.65),
    // 方式 2 的默认 8 维情感向量 [happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]
    defaultVector: [0, 0, 0, 0, 0, 0, 0, 1],
    // 默认输出格式 wav / mp3 / ogg / flac（mp3 体积约为 wav 的 1/7）
    defaultFormat: process.env.F5_TTS_FORMAT || "mp3",
    // 仅 mp3 有效，目标码率 kbps（32~128）
    defaultBitrate: Number(process.env.F5_TTS_BITRATE || 64),
  },
};
