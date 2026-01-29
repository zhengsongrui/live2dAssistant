package com.example.live2dofficial

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.opengl.GLSurfaceView
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import com.example.live2dofficial.audio.AudioRecordController
import com.example.live2dofficial.audio.PcmCallback
import com.example.live2dofficial.audio.WavUtil
import com.example.live2dofficial.live2d.ModelSwitchRequest
import com.example.live2dofficial.network.ApiClient
import com.example.live2dofficial.tts.TtsManager
import com.live2d.demo.full.GLRenderer
import com.live2d.demo.full.LAppDelegate
import com.live2d.demo.full.LAppLive2DManager
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : Activity(), PcmCallback {

    private lateinit var glSurfaceView: GLSurfaceView
    private lateinit var glRenderer: GLRenderer
    private lateinit var audioRecordController: AudioRecordController
    private lateinit var ttsManager: TtsManager


    @SuppressLint("ClickableViewAccessibility")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        ttsManager = TtsManager(this)

        audioRecordController = AudioRecordController(
            activity = this,
            pcmCallback = this
        )

        val rootLayout = FrameLayout(this)

        // ---------- GLSurfaceView ----------
        glSurfaceView = GLSurfaceView(this).apply {
            setEGLContextClientVersion(2)
            holder.setFormat(android.graphics.PixelFormat.TRANSLUCENT)
        }

        glRenderer = GLRenderer()
        glSurfaceView.setRenderer(glRenderer)
        glSurfaceView.renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY

        rootLayout.addView(
            glSurfaceView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        // ---------- 设置按钮 ----------
        val settingsButton = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_menu_preferences)
            setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener {
                startActivity(Intent(this@MainActivity, SettingsActivity::class.java))
            }
        }

        rootLayout.addView(
            settingsButton,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                topMargin = dp(12)
                rightMargin = dp(12)
            }
        )

        // ---------- 录音按钮 ----------
        val recordButton = ImageButton(this).apply {
            setImageResource(android.R.drawable.btn_radio)
            setBackgroundColor(Color.TRANSPARENT)
            setColorFilter(Color.RED)
            scaleType = ImageView.ScaleType.FIT_CENTER
        }

        // 绑定录音逻辑（核心拆分点）
        audioRecordController.bindToButton(recordButton)

        rootLayout.addView(
            recordButton,
            FrameLayout.LayoutParams(dp(164), dp(164)).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER
                bottomMargin = dp(12)
            }
        )
// 强制 Z 顺序
        settingsButton.bringToFront()
        recordButton.bringToFront()

        setContentView(rootLayout)
        hideSystemUI()
    }

    override fun onPcmReady(pcm: ByteArray) {

        val wavBytes = WavUtil.pcmToWav(
            pcmData = pcm,
            sampleRate = 16000,
            channels = 1,
            bitDepth = 16
        )

        ApiClient.uploadAudio(wavBytes) { text ->
            runOnUiThread {
                Log.d("ASR", "识别结果: $text")
                // TTS 播放
                ttsManager.speak(text)
            }
        }
    }
    // ---------- Live2D 生命周期 ----------

    override fun onStart() {
        super.onStart()
        LAppDelegate.getInstance().onStart(this)
    }

    override fun onResume() {
        super.onResume()
        glSurfaceView.onResume()

        val index = ModelSwitchRequest.pendingModelIndex ?: return
        MainScope().launch {
            delay(32)
            glSurfaceView.queueEvent {
                LAppLive2DManager.getInstance().changeScene(index)
            }
        }
        ModelSwitchRequest.pendingModelIndex = null
    }

    override fun onPause() {
        glSurfaceView.onPause()
        LAppDelegate.getInstance().onPause()
        super.onPause()
    }

    override fun onStop() {
        LAppDelegate.getInstance().onStop()
        super.onStop()
    }

    override fun onDestroy() {
        ttsManager.release()
        LAppDelegate.getInstance().onDestroy()
        super.onDestroy()
    }

    // ---------- 工具方法 ----------

    private fun dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_FULLSCREEN or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        } else {
            window.insetsController?.let { controller ->
                controller.hide(
                    WindowInsets.Type.statusBars() or
                            WindowInsets.Type.navigationBars()
                )
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        }
    }

    // ---------- Live2D 触摸事件 ----------
    override fun onTouchEvent(event: MotionEvent): Boolean {
        val pointX = event.x
        val pointY = event.y

        glSurfaceView.queueEvent {
            when (event.action) {
                MotionEvent.ACTION_DOWN ->
                    LAppDelegate.getInstance().onTouchBegan(pointX, pointY)

                MotionEvent.ACTION_MOVE ->
                    LAppDelegate.getInstance().onTouchMoved(pointX, pointY)

                MotionEvent.ACTION_UP,
                MotionEvent.ACTION_CANCEL ->
                    LAppDelegate.getInstance().onTouchEnd(pointX, pointY)
            }
        }
        return true
    }
}
