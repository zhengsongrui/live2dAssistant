// 小说 -> 角色化/情感化语音 合成服务
// 提供三个能力：
//   1) analyzeSegments：LLM 情感/角色识别分段，返回 JSON segments（情感分析接口用）
//   2) synthesizeSegments：将 segments 逐段情感 TTS 合成 + FFmpeg 合并（情感结果转语音接口用）
//   3) synthesizeNovel：完整链路 = 分析 + 合成（保留原 /novel-tts）
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { llmConfig } from "../../config/llm.js";
import { ttsConfig } from "../../config/tts.js";
import { novelConfig } from "../../config/novel.js";
import { cleanOutput } from "../../utils/textClean.js";
import { synthesizeEmotion } from "../tts/emotionTtsService.js";

const execFileAsync = promisify(execFile);

// 复用现有大模型接口（OpenAI 兼容，可指向本地 Ollama）
const client = new OpenAI({ baseURL: llmConfig.baseURL, apiKey: llmConfig.apiKey });

/**
 * 解析 LLM 输出为 segments 数组（容错：剥离 ```json 代码块、取首个 JSON 对象）
 */
function parseSegments(raw) {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i) || raw.match(/\{[\s\S]*\}/);
  const text = (m ? m[1] ?? m[0] : raw).trim();
  try {
    const data = JSON.parse(text);
    return Array.isArray(data.segments) ? data.segments : [];
  } catch {
    throw new Error("LLM 未返回合法 JSON 分段结果");
  }
}

/**
 * LLM 情感/角色识别分段：输入小说文本，输出 [{ role, text, emotion }]
 */
async function splitSegments(text, roles) {
  const roleHint = Array.isArray(roles) && roles.length ? `可识别的角色有：${roles.join("、")}。` : "";
  const prompt = `你是小说音频书的分段专家。请把下面小说文本切分为适合语音合成的若干段，识别每段说话角色与情感。
要求：
1. 严格只输出一个 JSON 对象，不要任何其它文字、解释或 Markdown 代码块。
2. 格式：{"segments":[{"role":"角色名","text":"段落文本","emotion":"情感描述"}]}
3. role 为说话人，叙述部分用"旁白"；emotion 为简短中文情感描述，如"平静地叙述""兴奋地说""低沉悲伤地说"。
4. 每段 text 控制在 200 字以内、语义完整，段落数量尽量少。
5. 【硬性要求，违反即为错误】只允许"切分"，禁止删减、改写、概括：所有段落 text 按顺序拼接后必须与原文一字不差，包括"冷声道""啜泣""叹气"等说话引导语以及冒号、引号、感叹号等标点。原文的每一个字都必须出现在某一段的 text 中。说话引导语（如"苏晚啜泣""老者叹气"）必须并入对应台词段或旁白段保留，绝不允许丢弃。

示例：
输入：他冷冷地说：“你走吧。”
合法输出：{"segments":[{"role":"他","text":"他冷冷地说：“你走吧。”","emotion":"冷冷地说"}]}
非法输出：{"segments":[{"role":"他","text":"你走吧。","emotion":"冷冷地说"}]}（丢失了"他冷冷地说"，判错）

${roleHint}
小说文本：
"""${text}"""`;
  const res = await client.chat.completions.create({
    model: llmConfig.model,
    messages: [
      { role: "system", content: "你只输出合法 JSON。" },
      { role: "user", content: prompt },
    ],
  });
  return parseSegments(res.choices[0].message.content ?? "");
}

/**
 * 校验并规整 segments（过滤空段、补齐默认字段、限制段数）
 */
function normalizeSegments(segments) {
  const list = (Array.isArray(segments) ? segments : [])
    .filter((s) => s && typeof s.text === "string" && s.text.trim())
    .slice(0, novelConfig.maxSegments);
  return list.map((s) => ({
    role: String(s.role ?? "旁白"),
    text: String(s.text).trim(),
    emotion: String(s.emotion ?? "平静地叙述"),
  }));
}

/**
 * 文本归一化：仅保留中英文与数字（用于容差匹配，忽略标点差异）
 */
function norm(s) {
  return String(s).replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * 原文完整性兜底：
 * LLM 分段时可能丢弃说话引导语（如"苏晚啜泣""老者叹气"），导致正文缺失。
 * 这里用原文对各段文本做贪心子序列匹配，把未被任何段覆盖的原文片段找回，
 * 作为新的旁白段插入对应位置，保证"切分不删减、原文逐字保留"。
 * @param {string} clean 清洗后的原文
 * @param {Array<{role,text,emotion}>} segments 规整后的分段
 * @returns {Array<{role,text,emotion}>} 补齐引导语后的分段
 */
function repairLostText(clean, segments) {
  // 建立 归一化原文 与 clean 原文 的字符索引映射
  const srcChars = [];
  const cleanIdx = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (/\p{L}|\p{N}/u.test(ch)) {
      srcChars.push(ch);
      cleanIdx.push(i);
    }
  }
  const src = srcChars.join("");
  if (!src) return segments;

  // 逐段贪心子序列匹配，标记原文中被覆盖的字符，并记录每段首个匹配位置
  const covered = new Array(src.length).fill(false);
  const segPos = new Array(segments.length).fill(null);
  segments.forEach((seg, si) => {
    const target = norm(seg.text);
    let i = 0;
    for (const ch of target) {
      const idx = src.indexOf(ch, i);
      if (idx === -1) continue; // 该字在原文中不存在（LLM 增字），跳过
      covered[idx] = true;
      if (segPos[si] === null || idx < segPos[si]) segPos[si] = idx;
      i = idx + 1;
    }
  });

  // 找出原文中未被任何段覆盖的连续区间（即被 LLM 丢弃的引导语）
  const lost = [];
  let start = -1;
  for (let i = 0; i <= src.length; i++) {
    const c = i < src.length ? covered[i] : true;
    if (!c && start === -1) start = i;
    if (c && start !== -1) {
      if (i - start > 0) lost.push({ start, end: i - 1 });
      start = -1;
    }
  }
  if (!lost.length) return segments;

  const result = [...segments];
  let offset = 0;
  for (const l of lost) {
    const text = clean.slice(cleanIdx[l.start], cleanIdx[l.end] + 1);
    // 只找回含汉字的片段，避免孤立标点
    if (!/\p{L}/u.test(text)) continue;
    // 插入到第一个匹配位置在丢失片段之后的段之前
    let pos = result.length;
    for (let j = 0; j < segments.length; j++) {
      if (segPos[j] !== null && segPos[j] > l.start) {
        pos = j + offset;
        break;
      }
    }
    result.splice(pos, 0, { role: "旁白", text, emotion: "平静地叙述" });
    offset += 1;
  }
  return result;
}

/**
 * FFmpeg concat 合并多个同格式音频文件
 */
async function mergeAudio(files, output) {
  const list = path.join(path.dirname(files[0]), "concat.txt");
  fs.writeFileSync(list, files.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
  await execFileAsync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", output]);
}

/**
 * 分批并发执行（限制同时进行的 TTS 合成数）
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return results;
}

/**
 * 1. 情感/角色分析：小说文本 -> JSON segments
 * @param {string} text 小说文本（必填）
 * @param {object} [options] roles 角色名数组（辅助识别）
 * @returns {Promise<Array<{ role: string, text: string, emotion: string }>>}
 */
export async function analyzeSegments(text, options = {}) {
  const clean = cleanOutput(text).slice(0, novelConfig.maxTextLength);
  if (!clean) throw new Error("文本为空");

  const segments = normalizeSegments(await splitSegments(clean, options.roles));
  if (!segments.length) throw new Error("未识别到有效段落");
  // 兜底：找回被 LLM 丢弃的说话引导语，保证原文逐字保留
  return repairLostText(clean, segments);
}

/**
 * 2. 情感结果转语音：JSON segments -> 逐段情感 TTS -> FFmpeg 合并 -> 最终音频
 * @param {Array<{ role, text, emotion }>} segments 情感分析结果
 * @param {object} [options] voice 音色 / speed 语速 / format 输出格式 / bitrate 码率
 * @returns {Promise<{ audio: Buffer, format: string, contentType: string }>}
 */
export async function synthesizeSegments(segments, options = {}) {
  const { voice, speed, format = ttsConfig.emotion.defaultFormat, bitrate } = options;
  const list = normalizeSegments(segments);
  if (!list.length) throw new Error("segments 为空");

  const dir = path.resolve(novelConfig.tempDir, `novel-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const audios = await mapWithConcurrency(list, novelConfig.maxConcurrency, (seg) =>
      synthesizeEmotion(seg.text, {
        voice,
        speed,
        format,
        bitrate,
        emotionMode: 3, // 方式 3：文本情感，直接使用 segments 中的情感描述
        emoText: seg.emotion,
      })
    );

    // 各段写入临时文件
    const files = audios.map((a, i) => {
      const f = path.join(dir, `seg-${i}.${a.format}`);
      fs.writeFileSync(f, a.audio);
      return f;
    });

    // FFmpeg 合并为最终音频（各段同 format，直接复用首段的 contentType）
    const output = path.join(dir, `merged.${format}`);
    await mergeAudio(files, output);
    const audio = fs.readFileSync(output);
    return { audio, format, contentType: audios[0].contentType };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * 3. 完整链路（保留）：小说文本 -> 情感分析 -> 分段合成
 * @param {string} text 小说文本（必填）
 * @param {object} [options] roles / voice / speed / format / bitrate
 */
export async function synthesizeNovel(text, options = {}) {
  const segments = await analyzeSegments(text, options);
  return synthesizeSegments(segments, options);
}
