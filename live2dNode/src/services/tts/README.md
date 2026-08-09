# tts/ - 语音合成服务目录

当前接入 **F5-TTS 官方服务**（`gradio_app.py` 启动，内置 FastAPI `GET /api/tts`）。

- [`f5TtsService.js`](./f5TtsService.js)：调用 F5-TTS `/api/tts` 接口合成语音，返回 wav Buffer
- 配置统一从 [`../../config/tts.js`](../../config/tts.js) 读取（经 `.env` 的 `F5_TTS_URL`、`F5_TTS_REF_FILE`、`F5_TTS_REF_TEXT`）

## 调用示例

```bash
# 合成并保存为 wav（本项目服务端口见 src/config/index.js）
curl "http://localhost:8999/tts?text=你好，我是猫娘" -o out.wav
```
