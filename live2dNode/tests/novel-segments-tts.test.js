// 测试 POST /novel/tts（情感分析结果转语音：segments 逐段合成 + FFmpeg 合并，返回音频）
//
// 运行方式：
//   先启动服务：npm run dev
//   再执行本测试：node tests/novel-segments-tts.test.js
//
// 默认请求 http://localhost:8999，可用环境变量 BASE_URL 覆盖。
// 合成后的音频保存在本文件同级的 out/ 目录下。
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:8999";
const PATH = "/novel/tts";
const OUT_DIR = path.join(__dirname, "out");

// 测试文本：约 50 字、4 个说话者（旁白 + 林澈 + 苏晚 + 老者）
// 注意：说话引导语（"冷声道""啜泣""叹气"等）必须保留在 text 中，不得丢弃
// 情感采用 8 维向量 emoVector：[happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]
const NOVEL_SEGMENTS = [
  { role: "旁白", text: "林澈推门而入，冷声道：", emoVector: [0, 0, 0, 0, 0, 0, 0, 1] },
  { role: "林澈", text: "苏晚，你终于来了。", emoVector: [0, 0.8, 0, 0, 0, 0, 0, 0.2] },
  { role: "旁白", text: "苏晚啜泣：", emoVector: [0, 0, 0, 0, 0, 0, 0, 1] },
  { role: "苏晚", text: "我等了你三年。", emoVector: [0, 0, 0.9, 0, 0, 0.4, 0, 0.1] },
  { role: "旁白", text: "老者叹气：", emoVector: [0, 0, 0, 0, 0, 0, 0, 1] },
  { role: "老者", text: "罢了，都走吧。", emoVector: [0, 0, 0.4, 0, 0, 0.7, 0, 0.3] },
  { role: "旁白", text: "烛火忽明忽暗。", emoVector: [0, 0, 0.5, 0, 0, 0.6, 0, 0.2] },
];

/** 根据 Content-Type 推断音频扩展名 */
function extFromContentType(ct) {
  if (/mpeg|mp3/.test(ct)) return "mp3";
  if (/ogg/.test(ct)) return "ogg";
  if (/flac/.test(ct)) return "flac";
  return "wav";
}

/** 逐条执行测试用例，收集通过/失败结果 */
async function runCase(name, fn) {
  try {
    await fn();
    console.log(`  ✔ ${name}`);
    return true;
  } catch (err) {
    console.error(`  ✘ ${name}`);
    console.error(`      ${err.message}`);
    return false;
  }
}

/** 发送 JSON POST 请求，返回 Response */
function postJson(body) {
  return fetch(`${BASE_URL}${PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  console.log(`\n[测试] POST ${PATH}（服务地址：${BASE_URL}）\n`);
  const results = [];

  // 用例 1：正常请求（segments 参照 API.md 示例），返回 200 + 音频数据
  results.push(
    await runCase("正常请求：返回 200 且响应为音频", async () => {
      const res = await postJson({
        segments: NOVEL_SEGMENTS,
        voice: "malele_3",
        format: "mp3",
        bitrate: 64,
      });

      if (res.status === 500) {
        const text = await res.text();
        assert.fail(`服务端返回 500（${text}）。请确认 LLM、F5-TTS、FFmpeg 均可用`);
      }
      assert.equal(res.status, 200, `期望状态码 200，实际 ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      assert.match(ct, /audio/, `期望 Content-Type 为 audio，实际 ${ct}`);

      const buf = Buffer.from(await res.arrayBuffer());
      assert.ok(buf.length > 0, "音频数据不应为空");
      const ext = extFromContentType(ct);
      fs.mkdirSync(OUT_DIR, { recursive: true });
      const file = path.join(OUT_DIR, "novel-segments-tts.mp3");
      fs.writeFileSync(file, buf);
      console.log(`      已保存 ${file}（${ct}），共 ${buf.length} 字节`);
    }),
  );

  // 用例 2：缺少 segments，返回 400
  results.push(
    await runCase("缺少 segments 参数：返回 400", async () => {
      const res = await postJson({});
      assert.equal(res.status, 400, `期望状态码 400，实际 ${res.status}`);
    }),
  );

  // 用例 3：segments 为空数组，返回 400
  results.push(
    await runCase("segments 为空数组：返回 400", async () => {
      const res = await postJson({ segments: [] });
      assert.equal(res.status, 400, `期望状态码 400，实际 ${res.status}`);
    }),
  );

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(`\n[结果] 共 ${results.length} 条用例：通过 ${passed}，失败 ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(
    "\n无法连接服务，请确认后端已启动（npm run dev）且地址正确：",
    err.message,
  );
  process.exitCode = 1;
});
