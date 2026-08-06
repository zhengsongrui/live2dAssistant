import { searchWebTool } from "./tavily.js";

// 工具注册表：以后新增工具，在这里加一行即可
const toolList = [searchWebTool];

// 转成 OpenAI 需要的 tools 参数格式（发给大模型）
export const tools = toolList.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
}));

// name -> 工具对象 的映射，供工具调用循环按名字查找执行
export const toolMap = Object.fromEntries(
  toolList.map((tool) => [tool.name, tool])
);
