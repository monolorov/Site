export default async function handler(req, res) {
    const universeId = "8960617980"

    try {
        const [gameRes, favRes, votesRes] = await Promise.allSettled([
            fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
                headers: {
                    Accept: "application/json"
                }
            }),
            fetch(`https://games.roblox.com/v1/games/${universeId}/favorites/count`, {
                headers: {
                    Accept: "application/json"
                }
            }),
            fetch(`https://games.roblox.com/v1/games/votes?universeIds=${universeId}`, {
                headers: {
                    Accept: "application/json"
                }
            })
        ])

        if (gameRes.status !== "fulfilled" || !gameRes.value.ok) {
            return res.status(gameRes.status === "fulfilled" ? gameRes.value.status : 500).json({
                error: "Failed to fetch game data"
            })
        }

        const gameJson = await gameRes.value.json()
        const game = Array.isArray(gameJson.data) ? gameJson.data[0] : null

        if (!game) {
            return res.status(404).json({
                error: "Game not found"
            })
        }

        let favorites = 0
        if (favRes.status === "fulfilled" && favRes.value.ok) {
            const favJson = await favRes.value.json()
            favorites = Number(favJson.favoritesCount ?? favJson.count ?? 0)
        }

        let likes = 0
        let dislikes = 0

        if (votesRes.status === "fulfilled" && votesRes.value.ok) {
            const votesJson = await votesRes.value.json()
            const voteItem = Array.isArray(votesJson.data) ? votesJson.data[0] : null

            likes = Number(voteItem?.upVotes ?? 0)
            dislikes = Number(voteItem?.downVotes ?? 0)
        }

        const totalVotes = likes + dislikes
        const rating = totalVotes > 0 ? (likes / totalVotes) * 100 : 0

        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120")

        return res.status(200).json({
            universeId,
            placeId: Number(game.rootPlaceId || 0),
            name: game.name || "DM ARENA",
            playing: Number(game.playing || 0),
            visits: Number(game.visits || 0),
            favorites,
            likes,
            dislikes,
            totalVotes,
            rating: Number(rating.toFixed(1)),
            updatedAt: Date.now()
        })
    } catch (err) {
        return res.status(500).json({
            error: "Internal server error",
            details: err instanceof Error ? err.message : String(err)
        })
    }
}
