import OpenAI from "openai";
import { llmConfig } from "../../config/llm.js";
import { tools, toolMap } from "../../tools/index.js";

// 创建 OpenAI 客户端（对接我们配置的大模型接口）
const client = new OpenAI({
  baseURL: llmConfig.baseURL, // 接口地址
  apiKey: llmConfig.apiKey, // 密钥
});

// 系统提示词：告诉大模型它扮演什么角色
const SYSTEM_PROMPT = "你是一只猫娘，语言简练但可爱。";

// 防止模型无限循环调用工具
const MAX_TOOL_ROUNDS = 5;

/**
 * 与大模型进行单轮对话
 * 支持工具调用：模型需要时先自动调用工具（如联网搜索），再基于结果回答
 * @param {string} userText 用户输入文本
 * @returns {Promise<string>} 模型回复文本
 */
export async function chatWithGPT(userText) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT }, // 系统角色
    { role: "user", content: userText }, // 用户内容
  ];

  // 首次请求，带上所有已注册工具
  let response = await client.chat.completions.create({
    model: llmConfig.model,
    messages,
    tools,
  });

  // 工具调用循环：模型要调工具就执行并回传结果，直到给出最终回答
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const message = response.choices[0].message;

    // 没有工具调用 → 直接返回最终回答
    if (!message.tool_calls) {
      return message.content;
    }

    // 有工具调用 → 保存助手消息，逐个执行工具，把结果回传
    messages.push(message);
    for (const call of message.tool_calls) {
      const tool = toolMap[call.function.name];
      const args = JSON.parse(call.function.arguments);
      const result = tool ? await tool.execute(args) : "未找到该工具";
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    // 携带工具结果再问一次模型
    response = await client.chat.completions.create({
      model: llmConfig.model,
      messages,
      tools,
    });
  }

  return response.choices[0].message.content ?? "";
}
