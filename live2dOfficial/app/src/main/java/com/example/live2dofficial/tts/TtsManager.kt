package com.example.live2dofficial.tts

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

class TtsManager(
    context: Context
) : TextToSpeech.OnInitListener {

    private val tts: TextToSpeech = TextToSpeech(context, this)
    private var ready = false

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts.language = Locale.CHINESE
            tts.setSpeechRate(1.0f)
            tts.setPitch(1.0f)
            ready = true
        }
    }

    fun speak(text: String) {
        if (!ready || text.isBlank()) return

        tts.stop()
        tts.speak(
            text,
            TextToSpeech.QUEUE_FLUSH,
            null,
            "live2d_tts"
        )
    }

    fun release() {
        tts.stop()
        tts.shutdown()
    }
}
