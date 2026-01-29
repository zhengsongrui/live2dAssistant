package com.example.live2dofficial.live2d

import android.content.Context
import android.util.Log
import java.io.IOException

/**
 * 动态扫描 assets 下的 Live2D 模型
 * 自动扫描 assets 根目录下包含 .model3.json 的文件夹
 */
object Live2DModelRepository {

    // 缓存模型列表，避免每次打开设置都重复扫描 IO
    private var cachedModelList: List<String>? = null

    /**
     * 直接获取模型列表（自动扫描）
     * @param context 需要 Context 来访问 Assets
     */
    fun getModelList(context: Context): List<String> {
        // 如果已经有缓存，直接返回
        if (cachedModelList != null && cachedModelList!!.isNotEmpty()) {
            return cachedModelList!!
        }

        val models = mutableListOf<String>()
        val assetManager = context.assets

        try {
            // 1. 获取 assets 根目录下的所有文件/文件夹
            // 根据你的截图，这里会获取到: Haru, Hiyori, Mao, Mark, Natori, Rice, Shaders, Wanko 等
            val rootDirs = assetManager.list("") ?: return emptyList()

            for (dirName in rootDirs) {
                // 排除一些显然不是模型的文件夹（如系统生成的 images, sounds 或 你的 Shaders 文件夹）
                if (dirName == "Shaders" || dirName == "images" || dirName.startsWith(".")) {
                    continue
                }

                // 2. 检查该文件夹下是否有 .model3.json 文件
                val files = assetManager.list(dirName)
                if (!files.isNullOrEmpty()) {
                    // 只要目录下包含 .model3.json 结尾的文件，就认为它是模型目录
                    val isModelDir = files.any { it.endsWith(".model3.json") }

                    if (isModelDir) {
                        models.add(dirName)
                        Log.d("Live2DRepo", "已发现模型: $dirName")
                    }
                }
            }
        } catch (e: IOException) {
            e.printStackTrace()
        }

        // 更新缓存
        cachedModelList = models
        return models
    }
}