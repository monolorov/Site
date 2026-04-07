import { Redis } from "@upstash/redis"

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN
})

const universeId = "8960617980"
const historyKey = `game:${universeId}:history`

export default async function handler(req, res) {
    try {
        const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
            headers: {
                Accept: "application/json"
            }
        })

        if (!gameRes.ok) {
            const text = await gameRes.text()
            return res.status(500).json({
                error: "Failed to load game data",
                details: text
            })
        }

        const gameJson = await gameRes.json()
        const game = gameJson?.data?.[0]

        if (!game) {
            return res.status(404).json({
                error: "Game not found"
            })
        }

        const point = {
            t: Date.now(),
            v: Number(game.playing) || 0
        }

        await redis.rpush(historyKey, JSON.stringify(point))

        const raw = await redis.lrange(historyKey, 0, -1)
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000

        const filtered = raw
            .map(item => {
                try {
                    return JSON.parse(item)
                } catch {
                    return null
                }
            })
            .filter(item => item && typeof item.t === "number" && typeof item.v === "number" && item.t >= cutoff)

        await redis.del(historyKey)

        if (filtered.length) {
            await redis.rpush(historyKey, ...filtered.map(item => JSON.stringify(item)))
        }

        res.setHeader("Cache-Control", "no-store, max-age=0")
        return res.status(200).json({
            ok: true,
            saved: point
        })
    } catch (err) {
        return res.status(500).json({
            error: "Unexpected server error",
            details: String(err)
        })
    }
}
