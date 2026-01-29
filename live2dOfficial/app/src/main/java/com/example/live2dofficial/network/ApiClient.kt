package com.example.live2dofficial.network

import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okio.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

object ApiClient {

    private const val TAG = "ASR_HTTP"
    private const val BASE_URL = "http://192.168.110.142:8000"

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS) // ⭐ 关键：ASR 推理时间
        .build()


    fun uploadAudio(
        wav: ByteArray,
        callback: (String) -> Unit
    ) {
        Log.d(TAG, "uploadAudio start, wav size = ${wav.size}")

        val body = RequestBody.create(
            "audio/wav".toMediaTypeOrNull(),
            wav
        )

        val url = "$BASE_URL/asr"
        Log.d(TAG, "POST $url")

        val request = Request.Builder()
            .url(url)
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {

            override fun onFailure(call: Call, e: IOException) {
                // ⭐ 核心：完整异常日志
                Log.e(TAG, "onFailure 请求失败", e)

                // ⭐ 分类打印，方便你一眼判断原因
                when (e) {
                    is UnknownHostException ->
                        Log.e(TAG, "❌ 无法解析主机（IP/域名错误 or 手机不在同一局域网）")

                    is ConnectException ->
                        Log.e(TAG, "❌ 连接被拒绝（后端没启动 / 端口不通）")

                    is SocketTimeoutException ->
                        Log.e(TAG, "❌ 连接超时（网络慢 / 后端卡死）")

                    else ->
                        Log.e(TAG, "❌ 其他 IO 异常：${e.javaClass.name}")
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val raw = response.body?.string()

                Log.d(TAG, "httpCode = ${response.code}")
                Log.d(TAG, "raw body = $raw")

                if (!response.isSuccessful) {
                    Log.e(TAG, "❌ HTTP 错误 ${response.code}")
                }

                callback(raw ?: "")
            }
        })
    }
}
