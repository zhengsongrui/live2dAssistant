// 繁体中文 -> 简体中文 转换工具：基于 opencc-js（OpenCC 词库的 JS 移植，纯 JS 无原生依赖）
// 使用 t2cn 专用入口（针对繁转简优化的词典）
// from 取 't'（OpenCC 标准繁体），可同时覆盖台湾/香港繁体写法；to 取 'cn'（简体）
import OpenCC from "opencc-js/t2cn";

// 模块级缓存转换器实例：词库较大，只初始化一次，避免每次调用重复构建
const converter = OpenCC.Converter({ from: "t", to: "cn" });

/**
 * 繁体中文转简体中文（供 TTS 等不识繁体的下游使用）
 * @param {string} [text] 待转换文本，空值直接返回空串
 * @returns {string} 简体文本
 */
export function toSimplified(text) {
  if (!text) return "";
  return converter(text);
}
