package com.example.live2dofficial.audio

object WavUtil {

    fun pcmToWav(
        pcmData: ByteArray,
        sampleRate: Int = 16000,
        channels: Int = 1,
        bitDepth: Int = 16
    ): ByteArray {

        val byteRate = sampleRate * channels * bitDepth / 8
        val totalDataLen = pcmData.size + 36
        val totalAudioLen = pcmData.size

        val header = ByteArray(44)

        // RIFF
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()

        writeInt(header, 4, totalDataLen)
        writeString(header, 8, "WAVE")

        // fmt chunk
        writeString(header, 12, "fmt ")
        writeInt(header, 16, 16)
        writeShort(header, 20, 1)
        writeShort(header, 22, channels.toShort())
        writeInt(header, 24, sampleRate)
        writeInt(header, 28, byteRate)
        writeShort(header, 32, (channels * bitDepth / 8).toShort())
        writeShort(header, 34, bitDepth.toShort())

        // data chunk
        writeString(header, 36, "data")
        writeInt(header, 40, totalAudioLen)

        return header + pcmData
    }

    private fun writeInt(data: ByteArray, offset: Int, value: Int) {
        data[offset] = (value and 0xff).toByte()
        data[offset + 1] = ((value shr 8) and 0xff).toByte()
        data[offset + 2] = ((value shr 16) and 0xff).toByte()
        data[offset + 3] = ((value shr 24) and 0xff).toByte()
    }

    private fun writeShort(data: ByteArray, offset: Int, value: Short) {
        data[offset] = (value.toInt() and 0xff).toByte()
        data[offset + 1] = ((value.toInt() shr 8) and 0xff).toByte()
    }

    private fun writeString(data: ByteArray, offset: Int, value: String) {
        value.toByteArray().copyInto(data, offset)
    }
}
