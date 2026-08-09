// F5-TTS HTTP API 调用示例（Node.js，用内置 fetch，无需额外依赖）
// 运行：node tts-example.js
const fs = require("fs");

async function main() {
  const res = await fetch("http://127.0.0.1:8000/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voice: "malele_3", // 音色 id，见 server/voices.yaml
      text: "熬到现在终于好了。",
      speed: 1, // 语速
      // seed: 42,          // 想固定结果就填一个数字
      remove_silence: true, // 去掉多余静音
      format: "mp3", // 输出格式：wav / mp3 / ogg / flac（默认 mp3，体积约为 wav 的 1/7）
      bitrate: 64, // 仅 mp3 有效，目标码率 kbps（32~128）
    }),
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
