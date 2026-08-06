import OpenAI from "openai";

const client = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chatWithGPT(userText) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      { role: "system", content: "你是一个虚拟角色。" },
      { role: "user", content: userText }
    ]
  });

  return response.choices[0].message.content;
}
