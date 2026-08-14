// 测试 POST /novel-tts（小说完整链路：分析 + 分段情感 TTS + FFmpeg 合并，返回音频）
//
// 运行方式：
//   先启动服务：npm run dev
//   再执行本测试：node tests/novel-tts-chain.test.js
//
// 默认请求 http://localhost:8999，可用环境变量 BASE_URL 覆盖。
// 合成后的音频保存在本文件同级的 out/ 目录下。
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:8999";
const PATH = "/novel-tts";
const OUT_DIR = path.join(__dirname, "out");

// 测试文本：约 50 字、4 个说话者（旁白 + 林澈 + 苏晚 + 老者）
const NOVEL_TEXT =
  "林澈推门而入，冷声道：“苏晚，你终于来了。”苏晚啜泣：“我等了你三年。”老者叹气：“罢了，都走吧。”烛火忽明忽暗。";
const NOVEL_ROLES = ["林澈", "苏晚", "老者"];

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

  // 用例 1：正常请求，返回 200 + 音频数据（真实合成，可能耗时较长）
  results.push(
    await runCase("正常请求：返回 200 且响应为音频", async () => {
      const res = await postJson({
        text: NOVEL_TEXT,
        roles: NOVEL_ROLES,
        voice: "malele_3",
        format: "mp3",
        bitrate: 64,
      });

      if (res.status === 500) {
        // 依赖（LLM 识别 / F5-TTS / FFmpeg）未就绪时后端会返回 500，给出指引
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
      const file = path.join(OUT_DIR, "novel-tts-chain.mp3");
      fs.writeFileSync(file, buf);
      console.log(`      已保存 ${file}（${ct}），共 ${buf.length} 字节`);
    }),
  );

  // 用例 2：不传 text，返回 400
  results.push(
    await runCase("缺少 text 参数：返回 400", async () => {
      const res = await postJson({});
      assert.equal(res.status, 400, `期望状态码 400，实际 ${res.status}`);
    }),
  );

  // 用例 3：text 为空字符串，返回 400
  results.push(
    await runCase("text 为空字符串：返回 400", async () => {
      const res = await postJson({ text: "" });
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
