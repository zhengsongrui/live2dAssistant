export function cleanOutput(text) {
  if (!text) return "";
  return text
    // 删除 <think>...</think>
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    // 删除多余的中英文括号（可选）
    .replace(/[（(][^）)]*[）)]/g, "")
    // 多空行压缩
    .replace(/\n{2,}/g, "\n")
    .trim();
}
