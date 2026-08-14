// 测试 POST /novel/analyze（小说情感/角色分析接口，返回 JSON segments）
//
// 运行方式：
//   先启动服务：npm run dev
//   再执行本测试：node tests/novel-analyze.test.js
//
// 默认请求 http://localhost:8999，可用环境变量 BASE_URL 覆盖，例如：
//   $env:BASE_URL="http://localhost:9000"; node tests/novel-analyze.test.js
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://localhost:8999";
const PATH = "/novel/analyze";

// 测试文本：约 50 字、4 个说话者（旁白 + 林澈 + 苏晚 + 老者）
const NOVEL_TEXT =
  "林澈推门而入，冷声道：“苏晚，你终于来了。”苏晚啜泣：“我等了你三年。”老者叹气：“罢了，都走吧。”烛火忽明忽暗。";
const NOVEL_ROLES = ["林澈", "苏晚", "老者"];

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

  // 用例 1：正常请求，返回 200 + segments 数组
  results.push(
    await runCase("正常请求：返回 200 且 segments 为非空数组", async () => {
      const res = await postJson({
        text: NOVEL_TEXT,
        roles: NOVEL_ROLES,
      });
      assert.equal(res.status, 200, `期望状态码 200，实际 ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      assert.match(ct, /json/, `期望 Content-Type 为 json，实际 ${ct}`);

      const data = await res.json();
      assert.ok(Array.isArray(data.segments), "响应中 segments 应为数组");
      assert.ok(data.segments.length > 0, "segments 不应为空数组");
      for (const seg of data.segments) {
        assert.equal(typeof seg.role, "string", "每段须包含 role 字段");
        assert.equal(typeof seg.text, "string", "每段须包含 text 字段");
        assert.equal(typeof seg.emotion, "string", "每段须包含 emotion 字段");
      }
      // 多角色校验：去重后的角色数应至少为 2（旁白 + 至少一个具名角色）
      const roles = [...new Set(data.segments.map((s) => s.role))];
      assert.ok(
        roles.length >= 2,
        `应识别出多个角色，实际识别到：${roles.join("、")}`,
      );
      // 原文完整性校验：所有分段 text 去标点拼接后，应覆盖原文每一个字
      // （说话引导语如"冷声道""啜泣""叹气"不得被丢弃）
      const norm = (s) => s.replace(/[^\p{L}\p{N}]/gu, "");
      const joined = norm(data.segments.map((s) => s.text).join(""));
      const source = norm(NOVEL_TEXT);
      for (const ch of new Set(source)) {
        assert.ok(
          joined.includes(ch),
          `原文中的"${ch}"未出现在任何分段中（正文被丢弃）`,
        );
      }
      console.log(`      共分析出 ${data.segments.length} 段，角色：${roles.join("、")}`);
      console.log(`      ${JSON.stringify(data.segments)}`);
      console.log(`      原文完整性校验：通过（${source.length} 个字符全部覆盖）`);
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
