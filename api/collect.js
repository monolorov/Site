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

        let history = await redis.get(historyKey)

        if (!Array.isArray(history)) {
            history = []
        }

        history.push(point)

        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        history = history.filter(item => {
            return item && typeof item.t === "number" && typeof item.v === "number" && item.t >= cutoff
        })

        await redis.set(historyKey, history)

        res.setHeader("Cache-Control", "no-store, max-age=0")
        return res.status(200).json({
            ok: true,
            saved: point,
            total: history.length
        })
    } catch (err) {
        return res.status(500).json({
            error: "Unexpected server error",
            details: String(err)
        })
    }
}
