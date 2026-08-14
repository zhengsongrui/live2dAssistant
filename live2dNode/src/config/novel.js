// 小说文本 -> 角色化/情感化语音 合成配置，统一收口（经 .env 可覆盖）
export const novelConfig = {
  // 最大输入文本长度（超长截断，防 LLM/TTS 超时）
  maxTextLength: Number(process.env.NOVEL_MAX_TEXT_LENGTH || 6000),
  // 最大分段数（超出截断）
  maxSegments: Number(process.env.NOVEL_MAX_SEGMENTS || 20),
  // TTS 并发合成数（每批同时合成段数）
  maxConcurrency: Number(process.env.NOVEL_MAX_CONCURRENCY || 4),
  // 临时目录（存放分段音频与合并文件，用系统临时目录）
  tempDir: process.env.NOVEL_TEMP_DIR || "tmp/novel",
};
