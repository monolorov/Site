export default async function handler(req, res) {
    const universeId = "8960617980"

    try {
        const [gameRes, favRes] = await Promise.all([
            fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
                headers: {
                    Accept: "application/json"
                }
            }),
            fetch(`https://apis.roblox.com/interactions/v1/games/${universeId}/favorites/count`, {
                headers: {
                    Accept: "application/json"
                }
            })
        ])

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

        let favoritedCount = typeof game.favoritedCount === "number" ? game.favoritedCount : null

        if (favRes.ok) {
            const favJson = await favRes.json()
            if (typeof favJson.count === "number") {
                favoritedCount = favJson.count
            }
        }

        res.setHeader("Cache-Control", "no-store, max-age=0")
        return res.status(200).json({
            universeId,
            playing: game.playing ?? 0,
            visits: game.visits ?? 0,
            favoritedCount: favoritedCount ?? 0
        })
    } catch (err) {
        return res.status(500).json({
            error: "Unexpected server error",
            details: String(err)
        })
    }
}
