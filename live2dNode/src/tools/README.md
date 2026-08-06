# tools/ - 外部能力工具集成目录（如联网搜索、天气查询等）

每个工具实现统一接口：`{ name, description, parameters, execute(args) }`

## 新增工具三步法

1. 在 `src/tools/` 新建工具文件（如 `weather.js`），导出标准工具对象：

```js
export const weatherTool = {
  name: "get_weather",
  description: "查询某城市的天气",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "城市名" },
    },
    required: ["city"],
  },
  async execute({ city }) {
    // 在这里实现具体逻辑
    return { city, weather: "晴" };
  },
};
```

2. 在 `src/tools/index.js` 注册表中加一行：

```js
import { weatherTool } from "./weather.js";
const toolList = [searchWebTool, weatherTool];
```

3. 完成——大模型自动获得新能力，`chatService` 无需任何改动。

## 工具约定

- `name`：唯一英文名，作为模型调用标识
- `description`：用中文描述该工具能做什么，帮助模型判断何时调用
- `parameters`：JSON Schema，声明参数类型与含义
- `execute(args)`：接收模型传来的参数对象，返回工具执行结果（会被序列化为 JSON 回传给模型）
