import { chatWithGPT } from "../services/llm/chatService.js";
import { cleanOutput } from "../utils/textClean.js";

/**
 * 处理 /asrText 文字对话测试接口：
 * 直接接收文本 -> 大模型对话 -> 清理输出 -> 返回文本
 */
export async function handleChatText(req, res) {
  try {
    const userText = req.query.text || "你好";
    console.log("用户说:" + userText);

    const replyText = await chatWithGPT(userText);

    const cleanText = cleanOutput(replyText);
    console.log("格式化后的回答:" + cleanText);
    res.send(cleanText);
  } catch (err) {
    console.error(err);
    res.status(500).send("ASR server error");
  }
}
