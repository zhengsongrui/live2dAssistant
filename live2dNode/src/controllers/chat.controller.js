import { chatWithGPT, chatStreamWithGPT } from "../services/llm/chatService.js";
import { cleanOutput } from "../utils/textClean.js";
import { isChatStream, streamChatToSse } from "../utils/sse.js";

/**
 * 处理 /asrText 文字对话测试接口：
 * 直接接收文本 -> 大模型对话 -> 清理输出 -> 返回文本
 * 支持 chatStream=true 时以 SSE 流式逐块输出（打字机效果）
 */
export async function handleChatText(req, res) {
  try {
    const userText = req.query.text || "你好";
    console.log("用户说:" + userText);

    // 流式：SSE 逐块输出原始文本增量（不做整段清理，保持实时性）
    if (isChatStream(req.query.chatStream)) {
      await streamChatToSse(res, userText, chatStreamWithGPT);
      return;
    }

    // 非流式：整段清理后返回完整文本
    const replyText = await chatWithGPT(userText);
    const cleanText = cleanOutput(replyText);
    console.log("格式化后的回答:" + cleanText);
    res.send(cleanText);
  } catch (err) {
    console.error(err);
    // 流式过程中出错：响应头可能已发出，无法再改状态码，直接结束
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).send("ASR server error");
    }
  }
}
