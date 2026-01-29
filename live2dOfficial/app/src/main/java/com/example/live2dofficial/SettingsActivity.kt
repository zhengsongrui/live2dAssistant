package com.example.live2dofficial

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.example.live2dofficial.live2d.Live2DModelRepository
import com.example.live2dofficial.live2d.ModelSwitchRequest

class SettingsActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. 设置 ScrollView，并在构造时给它一个背景色，便于调试是否成功加载
        val scrollView = ScrollView(this).apply {
            setBackgroundColor(Color.WHITE) // 强制白色背景，防止因 Theme 设置导致的透明或黑屏
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // 2. 设置 LinearLayout 容器，显式指定 LayoutParams
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(32, 32, 32, 32) // 添加一些内边距
        }

        // 3. 获取数据
        val modelList = Live2DModelRepository.getModelList(this)

        // 4. 调试：如果列表为空，显示一个提示文本
        if (modelList.isEmpty()) {
            val emptyTextView = TextView(this).apply {
                text = "未找到模型数据 (Model list is empty)"
                setTextColor(Color.BLACK)
                textSize = 18f
                gravity = Gravity.CENTER
                setPadding(0, 50, 0, 0)
            }
            layout.addView(emptyTextView)
        } else {
            // 5. 循环添加按钮
            modelList.forEachIndexed { index, modelName ->
                val button = Button(this).apply {
                    text = modelName
                    // 设置按钮的布局参数
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        topMargin = 16
                    }
                    setOnClickListener {
                        ModelSwitchRequest.pendingModelIndex = index
                        finish()
                    }
                }
                layout.addView(button)
            }
        }

        // 6. 将 layout 添加到 scrollView
        scrollView.addView(layout)

        // 7. 设置 ContentView
        setContentView(scrollView)
    }
}