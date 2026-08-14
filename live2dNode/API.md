# API 接口文档

- 基础地址：`http://localhost:8999`（端口可用 `PORT` 环境变量覆盖）
- 所有请求体均为 `Content-Type: application/json`，除非另有说明
- 音频接口响应为二进制音频（`Content-Type: audio/*`），其余为纯文本或 JSON

## 接口一览

| 方法 | 路径 | 说明 | 返回 |
|------|------|------|------|
| GET | `/` | 服务说明 | 文本 |
| GET | `/test` | 健康检查 | 文本 |
| POST | `/asr` | 语音→ASR→LLM 回复 | 文本 |
| GET | `/asrText` | 文字→LLM 回复 | 文本 |
| POST | `/tts` | 文字合成语音 | mp3 |
| GET | `/tts` | 文字合成语音（浏览器测试） | mp3 |
| POST | `/emotion-tts` | 语气（情感）合成语音 | 音频 |
| GET | `/emotion-tts` | 语气合成（浏览器测试，默认参数） | 音频 |
| GET | `/chatVoice` | 文字→LLM 回复→语音 | mp3 |
| POST | `/asrVoice` | 语音→ASR→LLM 回复→语音 | mp3 |
| POST | `/novel-tts` | 小说完整链路：分析+合成 | 音频 |
| POST | `/novel/analyze` | 小说情感/角色分析 | JSON |
| POST | `/novel/tts` | 情感结果转语音（合并） | 音频 |

---

## 1. 文本对话

### GET /asrText
文字经大模型对话后返回回复文本（默认"你好"）。

```bash
curl "http://localhost:8999/asrText?text=今天天气怎么样"
```

**响应**：`今天天气很好，适合出门散步。`

---

## 2. 语音识别对话

### POST /asr
请求体为原始音频二进制（`Content-Type: audio/mp3`），经 whisper 识别后由大模型回复。

```bash
curl -X POST http://localhost:8999/asr \
  -H "Content-Type: audio/mp3" \
  --data-binary @speech.mp3
```

**响应**：`我在呢，有什么可以帮你的？`

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

### POST /novel-tts（完整链路）
小说文本→LLM 角色/情感识别→分段情感 TTS→FFmpeg 合并，返回最终音频。

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
返回 JSON `segments`，供查看或二次调用 `/novel/tts`。

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

**响应**：

```json
{
  "segments": [
    { "role": "旁白", "text": "他推开门，", "emotion": "平静地叙述" },
    { "role": "他", "text": "你终于回来了！", "emotion": "激动地说" }
  ]
}
```

### POST /novel/tts（情感结果转语音）
将 `/novel/analyze` 返回的 segments 逐段合成并合并为最终音频。

```json
{
  "segments": [
    { "role": "旁白", "text": "他推开门，", "emotion": "平静地叙述" },
    { "role": "他", "text": "你终于回来了！", "emotion": "激动地说" }
  ],
  "voice": "malele_3",
  "format": "mp3"
}
```

**响应**：对应格式的二进制音频。

---

## 公共参数与约定

- **音频接口失败**：返回 `4xx`/`500` 文本错误信息（如 `缺少 text 参数`、`TTS server error`）。
- **音色 voice**：为 F5-TTS 服务端 `voices.yaml` 中的音色 id，如 `malele_3`。
- **seed**：传数字可固定合成结果（相同输入+种子=相同结果）。
- **格式 format**：`wav / mp3 / ogg / flac`，默认 `mp3`。
- **bitrate**：仅 `mp3` 有效，范围 `32~128` kbps，默认 `64`。
- **文本长度限制**：小说接口单次输入上限 6000 字（`NOVEL_MAX_TEXT_LENGTH`），最多 20 段（`NOVEL_MAX_SEGMENTS`）。
