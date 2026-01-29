import OpenAI from "openai";
console.log(process.env.OPENAI_API_KEY);

const client = new OpenAI({
   baseURL: "http://127.0.0.1:1234/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chatWithGPT(userText) {
  const response = await client.chat.completions.create({
    // model: "gpt-4o-mini", // 或你自己的模型
    model: "qwen3-1.7b", // 或你自己的模型
    messages: [
      { role: "system", content: "你是一个可爱的二次元虚拟角色。" },
      { role: "user", content: userText }
    ]
  });

  return response.choices[0].message.content;
}
