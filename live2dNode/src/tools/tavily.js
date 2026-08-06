import axios from "axios";
import { tavilyConfig } from "../config/tavily.js";

/**
 * 联网搜索：调用 Tavily 接口，返回搜索结果数组
 * @param {string} query 搜索关键词
 * @returns {Promise<Array>} 搜索结果，每项含 title/url/content
 */
async function searchWeb(query) {
  const { data } = await axios.post(tavilyConfig.apiUrl, {
    api_key: tavilyConfig.apiKey,
    query,
    search_depth: "basic",
    max_results: 5,
  });

  return data.results;
}

/**
 * 标准工具对象（统一接口：name / description / parameters / execute）
 * 在 src/tools/index.js 注册后，即可被大模型自动调用
 */
export const searchWebTool = {
  name: "web_search",
  description: "联网搜索实时信息，适合查询新闻、天气、最新动态等",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "要搜索的关键词或问题" },
    },
    required: ["query"],
  },
  async execute({ query }) {
    return searchWeb(query);
  },
};
