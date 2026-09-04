import OpenAI from "openai";
import { llmConfig } from "../../config/llm.js";
import { tools, toolMap } from "../../tools/index.js";

// 创建 OpenAI 客户端（对接我们配置的大模型接口）
const client = new OpenAI({
  baseURL: llmConfig.baseURL, // 接口地址
  apiKey: llmConfig.apiKey, // 密钥
});

// 系统提示词：告诉大模型它扮演什么角色
const SYSTEM_PROMPT = "你是一只猫娘，语言简练但可爱，回复不要带图标，不需要排版。";

// 防止模型无限循环调用工具
const MAX_TOOL_ROUNDS = 5;

/**
 * 执行工具调用并把结果以 tool 消息回传消息数组
 * @param {Array} messages 消息数组（会被追加 assistant + tool 消息）
 * @param {Array} toolCalls OpenAI 格式的工具调用列表
 */
async function executeTools(messages, toolCalls) {
  // 回传助手消息（包含工具调用声明），供模型继续推理
  messages.push({
    role: "assistant",
    content: null,
    tool_calls: toolCalls.map((c) => ({
      id: c.id,
      type: "function",
      function: c.function,
    })),
  });
  // 逐个执行工具，把结果回传
  for (const call of toolCalls) {
    const tool = toolMap[call.function.name];
    let args = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      args = {}; // 参数解析失败按空参处理
    }
    const result = tool ? await tool.execute(args) : "未找到该工具";
    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify(result),
    });
  }
}

/**
 * 与大模型进行单轮对话（非流式，保持原行为）
 * 支持工具调用：模型需要时先自动调用工具（如联网搜索），再基于结果回答
 * @param {string} userText 用户输入文本
 * @returns {Promise<string>} 模型回复文本
 */
export async function chatWithGPT(userText) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT }, // 系统角色
    { role: "user", content: userText }, // 用户内容
  ];

  // 工具调用循环：模型要调工具就执行并回传结果，直到给出最终回答
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // 首次请求，带上所有已注册工具
    const response = await client.chat.completions.create({
      model: llmConfig.model,
      messages,
      tools,
    });
    const message = response.choices[0].message;

    // 没有工具调用 → 直接返回最终回答
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content;
    }

    // 有工具调用 → 执行并把结果回传，进入下一轮
    await executeTools(messages, message.tool_calls);
  }

  return "";
}

/**
 * 与大模型进行单轮对话（流式）
 * 支持工具调用：流式模式下工具调用按 index 分片累积，触发工具后继续流式请求，
 * 最终回答的文本增量会逐块产出（打字机效果）
 * @param {string} userText 用户输入文本
 * @returns {AsyncGenerator<string>} 文本增量
 */
export async function* chatStreamWithGPT(userText) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT }, // 系统角色
    { role: "user", content: userText }, // 用户内容
  ];

  // 工具调用循环：模型要调工具就执行并回传结果，直到给出最终回答
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const streamRes = await client.chat.completions.create({
      model: llmConfig.model,
      messages,
      tools,
      stream: true, // 开启流式
    });

    // 按 index 累积工具调用分片（name / arguments 会分段到达）
    const acc = {};
    let finishedAsTool = false; // 本轮是否因触发工具而结束

    for await (const chunk of streamRes) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};

      // 文本增量：实时产出（工具回合模型通常无文本，不会污染输出）
      if (delta.content) yield delta.content;

      // 工具调用分片：按 index 拼接 name 与 arguments
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const cur = (acc[tc.index] ??= { id: "", name: "", arguments: "" });
          if (tc.id) cur.id += tc.id;
          if (tc.function?.name) cur.name += tc.function.name;
          if (tc.function?.arguments) cur.arguments += tc.function.arguments;
        }
      }

      if (choice.finish_reason === "tool_calls") finishedAsTool = true;
    }

    // 触发工具调用 → 执行并回传结果，进入下一轮继续流式
    const toolCalls = Object.values(acc).map((c) => ({
      id: c.id,
      function: { name: c.name, arguments: c.arguments },
    }));
    if (finishedAsTool && toolCalls.length) {
      await executeTools(messages, toolCalls);
      continue;
    }

    // 得到最终回答，结束流
    return;
  }
}
