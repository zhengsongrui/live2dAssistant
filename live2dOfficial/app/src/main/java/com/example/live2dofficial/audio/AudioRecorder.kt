package com.example.live2dofficial.audio

import android.Manifest
import android.media.*
import androidx.annotation.RequiresPermission
import java.io.ByteArrayOutputStream

class AudioRecorder {

    private val sampleRate = 16000
    private val channel = AudioFormat.CHANNEL_IN_MONO
    private val format = AudioFormat.ENCODING_PCM_16BIT

    private val minBufferSize =
        AudioRecord.getMinBufferSize(sampleRate, channel, format)

    // ⭐ bufferSize 兜底，防止非法值
    private val bufferSize =
        if (minBufferSize > 0) minBufferSize else sampleRate * 2

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordThread: Thread? = null

    private val outputStream = ByteArrayOutputStream()

    @RequiresPermission(Manifest.permission.RECORD_AUDIO)
    fun start() {
        if (isRecording) return

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channel,
            format,
            bufferSize
        )

        // ⭐ 必须检查状态
        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            audioRecord?.release()
            audioRecord = null
            return
        }

        outputStream.reset()
        isRecording = true
        audioRecord?.startRecording()

        recordThread = Thread {
            val buffer = ByteArray(bufferSize)
            while (isRecording) {
                val size = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (size > 0) {
                    outputStream.write(buffer, 0, size)
                }
            }
        }
        recordThread?.start()
    }

    fun stop(): ByteArray {
        if (!isRecording) return ByteArray(0)

        isRecording = false

        try {
            audioRecord?.stop()
        } catch (_: Exception) {
        }

        audioRecord?.release()
        audioRecord = null

        recordThread?.join()
        recordThread = null

        return outputStream.toByteArray()
    }
}
