# API 接口文档

- 基础地址：`http://localhost:8999`（端口可用 `PORT` 环境变量覆盖）
- 所有请求体均为 `Content-Type: application/json`，除非另有说明
- 音频接口响应为二进制音频（`Content-Type: audio/*`），其余为纯文本或 JSON
- 访问 `http://localhost:8999/` 返回本接口文档（HTML），供网页开发者直接浏览与复制示例

## 接口一览

| 方法 | 路径 | 说明 | 返回 |
|------|------|------|------|
| GET | `/` | 服务说明 / 接口文档 | HTML |
| GET | `/test` | 健康检查 | 文本 |
| POST | `/asr` | 语音→ASR→LLM 回复（支持流式） | 文本/SSE |
| GET | `/asrText` | 文字→LLM 回复（支持流式） | 文本/SSE |
| POST | `/tts` | 文字合成语音 | mp3 |
| GET | `/tts` | 文字合成语音（浏览器测试） | mp3 |
| POST | `/emotion-tts` | 语气（情感）合成语音 | 音频 |
| GET | `/emotion-tts` | 语气合成（浏览器测试，默认参数） | 音频 |
| GET | `/voices` | 获取全部音色列表 | JSON |
| GET | `/chatVoice` | 文字→LLM 回复→语音 | mp3 |
| POST | `/asrVoice` | 语音→ASR→LLM 回复→语音 | mp3 |
| POST | `/novelToTts` | 小说完整链路：分析+合成 | 音频 |
| POST | `/novel/analyze` | 小说情感/角色分析 | JSON |
| POST | `/novel/analyzeToTts` | 情感结果转语音（合并） | 音频 |

---

## 1. 文本对话

### GET /asrText
文字经大模型对话后返回回复文本（默认"你好"）。

**参数**：

| 参数 | 位置 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `text` | query | 否 | `你好` | 要发送给大模型的文本 |
| `chatStream` | query | 否 | `false` | 置为 `true` 开启 SSE 流式输出（打字机效果） |

```bash
# 非流式（默认）
curl "http://localhost:8999/asrText?text=今天天气怎么样"
# 流式
curl "http://localhost:8999/asrText?text=今天天气怎么样&chatStream=true"
```

**非流式响应**：`今天天气很好，适合出门散步。`

**流式响应**：`Content-Type: text/event-stream`，逐条返回 `data` 消息，结束为 `done`：

```
data: {"content":"今天"}
data: {"content":"天气很好"}
data: {"done":true}
```

**前端流式示例**（`fetch` + `ReadableStream` 逐块读取，实现打字机效果）：

```javascript
// 通用 SSE 解析：onContent 逐块回调，onDone 结束时回调
async function readSse(res, onContent, onDone) {
  const reader = res.body.getReader();       // 读取响应数据流
  const decoder = new TextDecoder("utf-8");
  let buffer = "";                           // 缓存可能被截断的半行

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 消息以空行分隔，逐条取出 "data:" 行
    const lines = buffer.split("\n");
    buffer = lines.pop();                    // 末尾半行留到下一轮
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const msg = JSON.parse(line.slice(5)); // 形如 {"content":"今天"}
      if (msg.done) { onDone?.(); return; }  // {done:true} 表示结束
      onContent?.(msg.content);              // 逐块追加，打字机效果
    }
  }
}

// /asrText 流式调用：文字 → LLM 回复
const res = await fetch("/asrText?text=今天天气怎么样&chatStream=true");
readSse(res, (chunk) => { replyEl.textContent += chunk; });
```

---

## 2. 语音识别对话

### POST /asr
请求体为原始音频二进制（`Content-Type: audio/mp3`），经 whisper 识别后由大模型回复。

**参数**：`chatStream` 走 query（请求体为音频二进制，无法放 JSON 参数）：置为 `true` 开启 SSE 流式输出。

```bash
# 非流式（默认）
curl -X POST http://localhost:8999/asr \
  -H "Content-Type: audio/mp3" \
  --data-binary @speech.mp3

# 流式
curl -X POST "http://localhost:8999/asr?chatStream=true" \
  -H "Content-Type: audio/mp3" \
  --data-binary @speech.mp3
```

**前端流式示例**（上传音频 → ASR → LLM 流式回复，SSE 解析复用上方 `/asrText` 的 `readSse`）：

```javascript
// audioBlob 为浏览器录制的 mp3 Blob
const res = await fetch("/asr?chatStream=true", {
  method: "POST",
  headers: { "Content-Type": "audio/mp3" },
  body: audioBlob,
});
readSse(res, (chunk) => { replyEl.textContent += chunk; }); // 逐块追加，打字机效果
```

**非流式响应**：`我在呢，有什么可以帮你的？`

---

## 3. 文字合成语音

### POST /tts

```json
{
  "text": "你好世界，欢迎使用语音合成。",
  "voice": "malele_3",
  "speed": 1.0,
  "seed": 42,
  "removeSilence": true
}
```

```bash
curl -X POST http://localhost:8999/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好世界","voice":"malele_3","speed":1.0}'
```

**响应**：`audio/mp3` 二进制音频。

### GET /tts（浏览器测试）
只需 `text`，其余可选 `voice / speed / seed / removeSilence`。

```
http://localhost:8999/tts?text=你好世界&voice=malele_3&speed=1
```

---

## 4. 语气（情感）语音合成

### POST /emotion-tts
三种情感控制方式（互斥，由 `emotionMode` 选择）：

- **方式 3（默认）**：文本情感，由 QwenEmotion 自动推断

```json
{
  "text": "今天天气真好，我们一起去公园散步吧。",
  "voice": "malele_3",
  "emotionMode": 3,
  "emoText": "开心地说",
  "format": "mp3",
  "bitrate": 64
}
```

- **方式 1**：参考音频情感（`emoAudioPrompt` 为音色 id 或路径）

```json
{
  "text": "今天天气真好。",
  "emotionMode": 1,
  "emoAudioPrompt": "voice_07",
  "emoAlpha": 0.65
}
```

- **方式 2**：8 维情感向量 `[happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]`

```json
{
  "text": "今天天气真好。",
  "emotionMode": 2,
  "emoVector": [0, 0, 0, 0, 0, 0, 0, 1],
  "emoAlpha": 0.65
}
```

**可选参数**：`voice`（音色）、`speed`（语速）、`seed`（固定结果）、`removeSilence`（去静音）、`format`（wav/mp3/ogg/flac，默认 mp3）、`bitrate`（仅 mp3，32~128）。

**响应**：对应格式的二进制音频。

### GET /emotion-tts（浏览器测试）
只需 `text`，其余用默认值。

```
http://localhost:8999/emotion-tts?text=今天天气真好
```

### GET /voices（获取音色列表）
列出全部音色 id 及其中文显示名（转发 F5-TTS 服务端 `voices.yaml`）。

```bash
curl http://localhost:8999/voices
```

**响应**：

```json
[{ "name": "乐乐3", "id": "malele_3" }]
```

---

## 5. 文字对话并语音合成

### GET /chatVoice
文字→LLM 回复→合成语音，返回 mp3。

```bash
curl "http://localhost:8999/chatVoice?text=你好"
```

**响应**：`audio/mp3` 二进制音频。

---

## 6. 语音对话并语音合成

### POST /asrVoice
请求体为原始音频（`Content-Type: audio/mp3`）：语音→ASR→LLM 回复→语音。

```bash
curl -X POST http://localhost:8999/asrVoice \
  -H "Content-Type: audio/mp3" \
  --data-binary @speech.mp3
```

**响应**：`audio/mp3` 二进制音频。

---

## 7. 小说语音合成

### POST /novelToTts（完整链路）
小说文本→LLM 角色识别 + 8 维情感向量识别→分段情感 TTS→FFmpeg 合并，返回最终音频。

```json
{
  "text": "他推开门，激动地说：\"你终于回来了！\"",
  "roles": ["他"],
  "voice": "malele_3",
  "format": "mp3"
}
```

**可选参数**：`roles`（角色名数组，辅助识别）、`voice`、`speed`、`format`、`bitrate`。

**响应**：对应格式的二进制音频。

### POST /novel/analyze（情感分析）
返回 JSON `segments`，供查看或二次调用 `/novel/analyzeToTts`。
每段含 8 维情感向量 `emoVector`，顺序固定为 `[happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]`，各维取值 0~1。

```json
{
  "text": "他推开门，激动地说：\"你终于回来了！\"",
  "roles": ["他"]
}
```

```bash
curl -X POST http://localhost:8999/novel/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"他推开门，激动地说：你终于回来了！"}'
```

**响应**（示例向量：旁白平静 = `[0,0,0,0,0,0,0,1]`；他激动 = `[0.9,0,0,0,0,0,0.4,0.1]`）：

```json
{
  "segments": [
    { "role": "旁白", "text": "他推开门，", "emoVector": [0, 0, 0, 0, 0, 0, 0, 1] },
    { "role": "他", "text": "你终于回来了！", "emoVector": [0.9, 0, 0, 0, 0, 0, 0.4, 0.1] }
  ]
}
```

### POST /novel/analyzeToTts（情感结果转语音）
将 `/novel/analyze` 返回的 segments 逐段合成并合并为最终音频。
各段情感按 `emoVector`（8 维情感向量）合成。

```json
{
  "segments": [
    { "role": "旁白", "text": "他推开门，", "emoVector": [0, 0, 0, 0, 0, 0, 0, 1] },
    { "role": "他", "text": "你终于回来了！", "emoVector": [0.9, 0, 0, 0, 0, 0, 0.4, 0.1] }
  ],
  "voice": "malele_3",
  "format": "mp3"
}
```

**响应**：对应格式的二进制音频。

---

## 公共参数与约定

- **chatStream**：`/asrText`、`/asr` 的流式开关，置为 `true` 时返回 SSE（`text/event-stream`），每条 `data: {"content":"..."}`，结束为 `data: {"done":true}`；流式模式不做整段文本清理，输出模型原始增量。
- **音频接口失败**：返回 `4xx`/`500` 文本错误信息（如 `缺少 text 参数`、`TTS server error`）。
- **音色 voice**：为 F5-TTS 服务端 `voices.yaml` 中的音色 id，如 `malele_3`。
- **seed**：传数字可固定合成结果（相同输入+种子=相同结果）。
- **格式 format**：`wav / mp3 / ogg / flac`，默认 `mp3`。
- **bitrate**：仅 `mp3` 有效，范围 `32~128` kbps，默认 `64`。
- **文本长度限制**：小说接口单次输入上限 6000 字（`NOVEL_MAX_TEXT_LENGTH`），最多 20 段（`NOVEL_MAX_SEGMENTS`）。
- **小说情感向量**：`/novel*` 接口的分段使用 8 维情感向量 `emoVector`，顺序固定为 `[happy, angry, sad, afraid, disgusted, melancholic, surprised, calm]`，各维取值 0~1；缺失或非法时回退默认向量（calm=1）。
