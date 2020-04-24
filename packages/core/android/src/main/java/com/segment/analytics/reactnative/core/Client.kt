package com.segment.analytics.reactnative.core

import android.text.TextUtils
import com.segment.analytics.ConnectionFactory
import com.segment.analytics.internal.Utils
import java.io.Closeable
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.util.zip.GZIPOutputStream

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Segment.io, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/** HTTP client which can upload payloads and fetch project settings from the Segment public API.  */
internal class Client(val writeKey: String?, connectionFactory: ConnectionFactory) {
    val connectionFactory: ConnectionFactory
    @Throws(IOException::class)
    fun upload(): Connection {
        val connection: HttpURLConnection = connectionFactory.upload(writeKey)
        return createPostConnection(connection)
    }

    @Throws(IOException::class)
    fun attribution(): Connection {
        val connection: HttpURLConnection = connectionFactory.attribution(writeKey)
        return createPostConnection(connection)
    }

    @Throws(IOException::class)
    fun fetchSettings(): Connection {
        val connection: HttpURLConnection = connectionFactory.projectSettings(writeKey)
        val responseCode = connection.responseCode
        if (responseCode != HttpURLConnection.HTTP_OK) {
            connection.disconnect()
            throw IOException("HTTP " + responseCode + ": " + connection.responseMessage)
        }
        return createGetConnection(connection)
    }

    /** Represents an HTTP exception thrown for unexpected/non 2xx response codes.  */
    internal class HTTPException(val responseCode: Int, val responseMessage: String, val responseBody: String) : IOException("HTTP $responseCode: $responseMessage. Response: $responseBody") {
        fun is4xx(): Boolean {
            return responseCode >= 400 && responseCode < 500
        }

    }

    /**
     * Wraps an HTTP connection. Callers can either read from the connection via the [ ] or write to the connection via [OutputStream].
     */
    internal abstract class Connection(connection: HttpURLConnection?, `is`: InputStream?, os: OutputStream?) : Closeable {
        val connection: HttpURLConnection
        val `is`: InputStream?
        val os: OutputStream?
        @Throws(IOException::class)
        override fun close() {
            connection.disconnect()
        }

        init {
            requireNotNull(connection) { "connection == null" }
            this.connection = connection
            this.`is` = `is`
            this.os = os
        }
    }

    companion object {
        @Throws(IOException::class)
        private fun createPostConnection(connection: HttpURLConnection): Connection {
            val outputStream: OutputStream
            // Clients may have opted out of gzip compression via a custom connection factory.
            val contentEncoding = connection.getRequestProperty("Content-Encoding")
            outputStream = if (TextUtils.equals("gzip", contentEncoding)) {
                GZIPOutputStream(connection.outputStream)
            } else {
                connection.outputStream
            }
            return object : Connection(connection, null, outputStream) {
                @Throws(IOException::class)
                override fun close() {
                    try {
                        val responseCode = connection.responseCode
                        if (responseCode >= 300) {
                            var responseBody: String
                            var inputStream: InputStream? = null
                            try {
                                inputStream = Utils.getInputStream(connection)
                                responseBody = Utils.readFully(inputStream)
                            } catch (e: IOException) {
                                responseBody = "Could not read response body for rejected message: $e"
                            } finally {
                                inputStream?.close()
                            }
                            throw HTTPException(responseCode, connection.responseMessage, responseBody)
                        }
                    } finally {
                        super.close()
                        os!!.close()
                    }
                }
            }
        }

        @Throws(IOException::class)
        private fun createGetConnection(connection: HttpURLConnection): Connection {
            return object : Connection(connection, Utils.getInputStream(connection), null) {
                @Throws(IOException::class)
                override fun close() {
                    super.close()
                    `is`!!.close()
                }
            }
        }
    }

    init {
        this.connectionFactory = connectionFactory
    }
}