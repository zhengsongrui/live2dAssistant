// 大模型相关配置，统一从环境变量读取
export const llmConfig = {
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
};
