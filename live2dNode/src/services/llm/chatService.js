import OpenAI from "openai";
import { llmConfig } from "../../config/llm.js";

const client = new OpenAI({
  baseURL: llmConfig.baseURL,
  apiKey: llmConfig.apiKey,
});

const SYSTEM_PROMPT = "你是一个虚拟角色。";

/**
 * 与大模型进行单轮对话
 * @param {string} userText 用户输入文本
 * @returns {Promise<string>} 模型回复文本
 */
export async function chatWithGPT(userText) {
  const response = await client.chat.completions.create({
    model: llmConfig.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText },
    ],
  });

  return response.choices[0].message.content;
}
