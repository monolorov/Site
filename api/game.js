export default async function handler(req, res) {
    const universeId = "8960617980"

    try {
        const [gameRes, favRes, votesRes] = await Promise.all([
            fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
                headers: {
                    Accept: "application/json"
                }
            }),
            fetch(`https://apis.roblox.com/interactions/v1/games/${universeId}/favorites/count`, {
                headers: {
                    Accept: "application/json"
                }
            }),
            fetch(`https://games.roblox.com/v1/games/${universeId}/votes`, {
                headers: {
                    Accept: "application/json"
                }
            })
        ])

        if (!gameRes.ok) {
            return res.status(gameRes.status).json({
                error: "Failed to fetch game data"
            })
        }

        if (!favRes.ok) {
            return res.status(favRes.status).json({
                error: "Failed to fetch favorites"
            })
        }

        if (!votesRes.ok) {
            return res.status(votesRes.status).json({
                error: "Failed to fetch votes"
            })
        }

        const gameJson = await gameRes.json()
        const favJson = await favRes.json()
        const votesJson = await votesRes.json()

        const game = Array.isArray(gameJson.data) ? gameJson.data[0] : null

        if (!game) {
            return res.status(404).json({
                error: "Game not found"
            })
        }

        const likes = Number(votesJson.upVotes || 0)
        const dislikes = Number(votesJson.downVotes || 0)
        const totalVotes = likes + dislikes
        const rating = totalVotes > 0 ? Number(((likes / totalVotes) * 100).toFixed(2)) : 0

        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120")

        return res.status(200).json({
            universeId,
            placeId: game.rootPlaceId,
            name: game.name,
            playing: Number(game.playing || 0),
            visits: Number(game.visits || 0),
            favorites: Number(favJson.count || 0),
            likes,
            dislikes,
            totalVotes,
            rating,
            updatedAt: Date.now()
        })
    } catch (err) {
        return res.status(500).json({
            error: "Internal server error",
            details: err instanceof Error ? err.message : String(err)
        })
    }
}
