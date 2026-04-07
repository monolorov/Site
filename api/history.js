import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()
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

        const cutoff = now - ms
        const raw = await redis.lrange(historyKey, 0, -1)

        const data = raw
            .map(x => {
                try {
                    return JSON.parse(x)
                } catch {
                    return null
                }
            })
            .filter(x => x && typeof x.t === "number" && typeof x.v === "number" && x.t >= cutoff)

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
