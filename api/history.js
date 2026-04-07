import { Redis } from "@upstash/redis"

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN
})

const universeId = "8960617980"
const historyKey = `game:${universeId}:history`

export default async function handler(req, res) {
    try {
        const range = req.query.range || "24h"
        const now = Date.now()

        let ms = 24 * 60 * 60 * 1000

        if (range === "1h") ms = 60 * 60 * 1000
        if (range === "7d") ms = 7 * 24 * 60 * 60 * 1000
        if (range === "30d") ms = 30 * 24 * 60 * 60 * 1000

        const raw = await redis.lrange(historyKey, 0, -1)

        const data = raw
            .map(item => {
                try {
                    return JSON.parse(item)
                } catch {
                    return null
                }
            })
            .filter(item => item && typeof item.t === "number" && typeof item.v === "number" && now - item.t <= ms)

        res.setHeader("Cache-Control", "no-store, max-age=0")
        return res.status(200).json({
            universeId,
            range,
            data
        })
    } catch (err) {
        return res.status(500).json({
            error: "Unexpected server error",
            details: String(err)
        })
    }
}
