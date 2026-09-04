/**
 * SSE（Server-Sent Events）流式响应辅助
 * 用于 LLM 流式聊天接口：解析开关、初始化响应头、逐块输出文本增量、结束。
 */

/** 解析 chatStream 开关：true/1 视为开启 */
export function isChatStream(value) {
  return value === "true" || value === "1";
}

/** 初始化 SSE 响应头（必须在任何 res.write 之前调用） */
export function initSse(res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // 立即刷出响应头，确保客户端第一时间进入流式监听状态
  res.flushHeaders();
}

/**
 * 以 SSE 流式输出大模型聊天结果：
 * 初始化响应头 → 逐块写入 {content} → 写入 {done} 结束
 * @param {import("express").Response} res Express 响应对象
 * @param {string} userText 用户输入文本
 * @param {(text: string) => AsyncGenerator<string>} streamFn 流式聊天生成器（如 chatStreamWithGPT）
 */
export async function streamChatToSse(res, userText, streamFn) {
  initSse(res);
  for await (const chunk of streamFn(userText)) {
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}
