package com.beatscrobble.app.repository.api

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.net.CookieHandler
import java.util.Collections

/**
 * Internal implementation of JavaNetCookieJar to avoid external dependency crashes.
 * Delegates to java.net.CookieHandler (CookieManager).
 */
class JavaNetCookieJar(private val cookieHandler: CookieHandler) : CookieJar {
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val cookieStrings = mutableListOf<String>()
        for (cookie in cookies) {
            cookieStrings.add(cookie.toString())
        }
        val multimap = mapOf("Set-Cookie" to cookieStrings)
        try {
            cookieHandler.put(url.uri(), multimap)
        } catch (e: Exception) {
            // Ignore format errors
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val headers = try {
            cookieHandler.get(url.uri(), emptyMap<String, List<String>>())
        } catch (e: Exception) {
            return emptyList()
        }

        val cookies = mutableListOf<Cookie>()
        for ((key, value) in headers) {
            if (("Cookie".equals(key, ignoreCase = true) || "Cookie2".equals(key, ignoreCase = true)) && value.isNotEmpty()) {
                for (header in value) {
                    cookies.addAll(decodeHeaderAsJavaNetCookies(url, header))
                }
            }
        }
        return cookies
    }

    private fun decodeHeaderAsJavaNetCookies(url: HttpUrl, header: String): List<Cookie> {
        val result = mutableListOf<Cookie>()
        var pos = 0
        val limit = header.length
        var pairEnd: Int
        while (pos < limit) {
            pairEnd = delimiterOffset(header, pos, limit, ";,")
            val equalsSign = delimiterOffset(header, pos, pairEnd, '=')
            val name = header.substring(pos, equalsSign).trim()
            if (name.startsWith("$")) {
                pos = pairEnd + 1
                continue
            }

            // We use a dummy value because we are parsing the Cookie header from the CookieManager
            // which provides "name=value".
            // However, OkHttp's Cookie.parse expects correct attributes.
            // Since we are SENDING these, we just need name and value.
            
            // Simpler approach: Use OkHttp's parsing if possible, but the string is just "key=value".
            // Let's manually parse robustly.
            val value = if (equalsSign < pairEnd) {
                header.substring(equalsSign + 1, pairEnd).trim()
            } else {
                ""
            }
            
            // Build the cookie
            // We strip quoting if present
            val unquotedValue = if (value.startsWith("\"") && value.endsWith("\"") && value.length >= 2) {
                value.substring(1, value.length - 1)
            } else {
                value
            }
            
            result.add(Cookie.Builder()
                .name(name)
                .value(unquotedValue)
                .domain(url.host)
                .build())
            
            pos = pairEnd + 1
        }
        return result
    }

    private fun delimiterOffset(input: String, pos: Int, limit: Int, delimiters: String): Int {
        for (i in pos until limit) {
            if (delimiters.contains(input[i])) {
                return i
            }
        }
        return limit
    }
}
