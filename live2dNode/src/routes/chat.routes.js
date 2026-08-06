import express from "express";
import { handleChatText } from "../controllers/chat.controller.js";

const router = express.Router();

// 文字对话测试接口
router.get("/asrText", handleChatText);

export default router;
