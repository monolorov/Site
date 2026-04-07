import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()
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

        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        const raw = await redis.lrange(historyKey, 0, -1)
        const filtered = raw
            .map(x => {
                try {
                    return JSON.parse(x)
                } catch {
                    return null
                }
            })
            .filter(x => x && typeof x.t === "number" && x.t >= cutoff)

        await redis.del(historyKey)

        if (filtered.length > 0) {
            await redis.rpush(historyKey, ...filtered.map(x => JSON.stringify(x)))
        }

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
