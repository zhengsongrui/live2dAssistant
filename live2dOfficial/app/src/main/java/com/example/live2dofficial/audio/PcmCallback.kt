package com.example.live2dofficial.audio

interface PcmCallback {
    fun onPcmReady(pcm: ByteArray)
}