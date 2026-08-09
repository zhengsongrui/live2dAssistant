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
};
