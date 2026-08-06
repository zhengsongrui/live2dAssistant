import express from "express";
import { handleAsr } from "../controllers/asr.controller.js";

const router = express.Router();

// 语音识别对话接口
router.post("/asr", handleAsr);

// 健康检查接口
router.get("/test", (req, res) => {
  res.send("成功");
});

export default router;
