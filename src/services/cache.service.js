/**
 * Cache matches by date range (last 30 days + next 30 days)
 * This ensures recent and upcoming matches are always in cache
 */
const cacheMatchesByDateRange = async () => {
    try {
        const today = new Date();

        // Calculate date range: 30 days back, 30 days forward
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);

        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 30);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        console.log(`  Buscando partidas de ${startStr} até ${endStr}...`);

        let cachedCount = 0;
        let currentDate = new Date(startDate);

        // Fetch matches day by day to avoid large responses
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];

            try {
                const url = `${BASE_URL}/fixtures/date/${dateStr}?api_token=${token}&include=participants;scores;state;league`;
                const { data } = await axios.get(url);
                const fixtures = data.data || [];

                if (fixtures.length > 0) {
                    console.log(`  📅 ${dateStr}: ${fixtures.length} partidas encontradas`);

                    for (const fixture of fixtures) {
                        try {
                            const participants = fixture.participants || [];
                            const homeTeam = participants.find(p => p.meta?.location === 'home');
                            const awayTeam = participants.find(p => p.meta?.location === 'away');

                            if (!homeTeam || !awayTeam) continue;

                            const scores = fixture.scores || [];
                            const homeScore = scores.find(s => s.participant_id === homeTeam.id);
                            const awayScore = scores.find(s => s.participant_id === awayTeam.id);

                            // Cache match basic data
                            await Match.upsert({
                                externalId: fixture.id,
                                fixture_date: new Date(fixture.starting_at),
                                status: fixture.state?.state || 'NS',
                                team_ids: [homeTeam.id, awayTeam.id],
                                data: {
                                    fixture_id: fixture.id,
                                    home_team: {
                                        id: homeTeam.id,
                                        name: homeTeam.name,
                                        score: homeScore?.score?.goals || 0
                                    },
                                    away_team: {
                                        id: awayTeam.id,
                                        name: awayTeam.name,
                                        score: awayScore?.score?.goals || 0
                                    },
                                    state: fixture.state?.state || 'NS',
                                    league: {
                                        id: fixture.league?.id,
                                        name: fixture.league?.name
                                    }
                                },
                                cached_at: new Date(),
                                cache_source: 'date_range_warmup'
                            });

                            cachedCount++;

                        } catch (error) {
                            console.error(`    Erro ao cachear partida ${fixture.id}:`, error.message);
                        }
                    }
                }

                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);

                // Rate limiting
                await sleep(RATE_LIMIT_DELAY);

            } catch (error) {
                if (error.response?.status !== 404) {
                    console.error(`  Erro ao buscar partidas de ${dateStr}:`, error.message);
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        console.log(`  ✅ Total de ${cachedCount} partidas cachadas por data`);
        return cachedCount;

    } catch (error) {
        console.error('Erro ao cachear partidas por data:', error.message);
        return 0;
    }
};

export { cacheMatchesByDateRange };
