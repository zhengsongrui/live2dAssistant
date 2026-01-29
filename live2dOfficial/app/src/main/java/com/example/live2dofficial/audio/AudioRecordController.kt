package com.example.live2dofficial.audio

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.PackageManager
import android.util.Log
import android.view.MotionEvent
import android.widget.ImageButton
import androidx.annotation.RequiresPermission

class AudioRecordController(
    private val activity: Activity,
    private val pcmCallback: PcmCallback
) {

    private val audioRecorder = AudioRecorder()
    private val pcmPlayer = PcmPlayer(sampleRate = 16000)

    companion object {
        const val REQUEST_CODE_RECORD_AUDIO = 1001
    }

    @SuppressLint("ClickableViewAccessibility", "MissingPermission")
    fun bindToButton(button: ImageButton) {
        button.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    if (hasPermission()) {
                        startRecord()
                    } else {
                        requestPermission()
                    }
                    true
                }

                MotionEvent.ACTION_UP,
                MotionEvent.ACTION_CANCEL -> {
                    stopRecord()
                    true
                }

                else -> false
            }
        }
    }

    @RequiresPermission(Manifest.permission.RECORD_AUDIO)
    private fun startRecord() {
        audioRecorder.start()
        Log.d("Recorder", "start")
    }

    private fun stopRecord() {
        val pcm = audioRecorder.stop()
        Log.d("Recorder", "stop, size=${pcm.size}")

        if (pcm.isNotEmpty()) {
            pcmPlayer.play(pcm)
            // ⭐ 只把 PCM 抛出去
            activity.runOnUiThread {
                pcmCallback.onPcmReady(pcm)
            }
//            val wavBytes = WavUtil.pcmToWav(
//                pcmData = pcm,
//                sampleRate = 16000,
//                channels = 1,
//                bitDepth = 16
//            )
//
//            ApiClient.uploadAudio(wavBytes) { text ->
//                activity.runOnUiThread {
//                    Log.d("ASR", "识别结果: $text")
//                }
//            }
        }
    }

    private fun hasPermission(): Boolean {
        return activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
    }

    private fun requestPermission() {
        activity.requestPermissions(
            arrayOf(Manifest.permission.RECORD_AUDIO),
            REQUEST_CODE_RECORD_AUDIO
        )
    }
}
