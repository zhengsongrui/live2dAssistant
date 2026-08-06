/**
 * 清理大模型输出的文本：
 * - 删除 <think>...</think> 思维链
 * - 删除多余的中英文括号内容
 * - 压缩多空行
 */
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
