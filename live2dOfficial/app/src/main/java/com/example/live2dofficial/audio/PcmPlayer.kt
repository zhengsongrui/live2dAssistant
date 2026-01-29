package com.example.live2dofficial.audio

import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Log

@Suppress("DEPRECATION")
class PcmPlayer(
    private val sampleRate: Int = 16000
) {

    private var audioTrack: AudioTrack? = null

    fun play(pcmData: ByteArray) {
        if (pcmData.isEmpty()) {
            Log.e("PcmPlayer", "pcmData is empty")
            return
        }

        stop()

        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        if (minBufferSize <= 0) {
            Log.e("PcmPlayer", "Invalid minBufferSize=$minBufferSize")
            return
        }

        val bufferSize = maxOf(minBufferSize, pcmData.size)

        // ⭐ 使用 legacy 构造函数 + MODE_STREAM（最稳）
        audioTrack = AudioTrack(
            AudioManager.STREAM_MUSIC,
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize,
            AudioTrack.MODE_STREAM
        )

        if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
            Log.e("PcmPlayer", "AudioTrack init failed (legacy)")
            audioTrack?.release()
            audioTrack = null
            return
        }

        audioTrack?.play()

        val written = audioTrack?.write(pcmData, 0, pcmData.size) ?: 0
        if (written <= 0) {
            Log.e("PcmPlayer", "write failed=$written")
            stop()
        }
    }

    private fun stop() {
        audioTrack?.let {
            try {
                it.stop()
            } catch (_: Exception) {
            }
            it.release()
        }
        audioTrack = null
    }
}
