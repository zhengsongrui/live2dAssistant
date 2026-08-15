// 生僻字 -> 同音常用字 替换工具（供 TTS 合成前使用，避免生僻字无法正确发音）
// 说明：映射表键可能为繁体写法（如 "驫"），而合成前文本已先转简体（"骉"），
// 故构建统一映射时把每个键的简体形式一并纳入，保证繁体/简体两种写法都能命中。
import { ttsRareCharMap } from "./ttsRareCharMap.js";
import { toSimplified } from "./toSimplified.js";

// 模块级预编译：统一映射（原键 + 简体形式）与匹配正则（键均为普通汉字，无正则元字符）
const unifiedMap = {};
for (const [k, v] of Object.entries(ttsRareCharMap)) {
  unifiedMap[k] = v;
  unifiedMap[toSimplified(k)] = v;
}
const RARE_CHAR_REGEX = new RegExp(`[${Object.keys(unifiedMap).join("")}]`, "g");

/**
 * 将文本中的生僻字替换为同音常用字
 * @param {string} [text] 待处理文本，空值直接返回空串
 * @returns {string} 替换后的文本（无生僻字时原样返回）
 */
export function replaceRareChars(text) {
  if (!text) return "";
  return text.replace(RARE_CHAR_REGEX, (ch) => unifiedMap[ch]);
}
