// Cache Service - Aggressive Pre-Caching System
// Pre-loads all leagues, teams, and 90 matches per team into database cache

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { League, Team, Match, CacheMetadata } from '../models/index.js';
import { getMatchStats } from '../features/match/match.service.js';
import { Op } from 'sequelize';

dotenv.config();

const BASE_URL = 'https://api.sportmonks.com/v3/football';
const token = process.env.SPORTMONKS_API_TOKEN || "Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh";

// Rate limiting configuration - OPTIMIZED FOR SPEED
const RATE_LIMIT_DELAY = 50;  // 50ms between requests (~1200 requests/minute) - FASTER!
const BATCH_SIZE = 500;       // Process 500 items before pause - BIGGER BATCHES!
const BATCH_DELAY = 1000;     // 1s pause between batches - SHORTER PAUSES!

// Cache TTL configuration
const CACHE_TTL = {
    LIVE_MATCH: 5 * 60 * 1000,      // 5 minutes
    UPCOMING_MATCH: 60 * 60 * 1000, // 1 hour
    FINISHED_MATCH: 24 * 60 * 60 * 1000, // 24 hours
    TEAM_HISTORY: 60 * 60 * 1000,   // 1 hour
    LEAGUE_DATA: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Main initialization function - called on server startup
 */
export const initializeCache = async () => {
    console.log('🔄 Inicializando sistema de cache...');

    try {
        const shouldWarmup = await shouldPerformFullWarmup();

        if (shouldWarmup) {
            console.log('📦 Cache vazio ou expirado - iniciando cache warming completo...');
            const result = await performFullWarmup();
            return {
                success: true,
                message: 'Cache warming completo realizado',
                stats: result
            };
        } else {
            console.log('✅ Cache existente ainda válido - realizando atualização incremental...');
            const result = await performIncrementalUpdate();
            return {
                success: true,
                message: 'Atualização incremental realizada',
                stats: result
            };
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar cache:', error.message);
        // Don't fail server startup on cache errors
        return {
            success: false,
            message: 'Erro ao inicializar cache - servidor iniciará sem cache pré-carregado',
            error: error.message,
            stats: { leagues: 0, teams: 0, matches: 0 }
        };
    }
};

/**
 * Determine if full cache warmup is needed
 */
const shouldPerformFullWarmup = async () => {
    try {
        // Check if we have data in database (regardless of cache_status)
        const totalLeagues = await League.count();
        const totalTeams = await Team.count();
        const totalMatches = await Match.count();

        console.log(`📊 Current cache: ${totalLeagues} leagues, ${totalTeams} teams, ${totalMatches} matches`);

        // If we have substantial data, do incremental update instead
        if (totalLeagues >= 50 && totalTeams >= 500 && totalMatches >= 5000) {
            console.log('✅ Sufficient cache exists - using incremental update');
            return false; // Use incremental update
        }

        console.log('⚠️  Insufficient cache - performing full warmup');
        return true; // Do full warmup
    } catch (error) {
        console.error('Error checking cache status:', error.message);
        return false; // Default to incremental update on error (safer)
    }
};

/**
 * Perform full cache warming - loads everything
 */
const performFullWarmup = async () => {
    console.log('🚀 Iniciando cache warming completo...');
    const startTime = Date.now();

    let stats = {
        leagues: 0,
        teams: 0,
        matches: 0,
        errors: 0
    };

    try {
        // Step 1: Cache all priority leagues
        console.log('📋 Etapa 1/3: Carregando ligas prioritárias...');
        const leagues = await cachePriorityLeagues();
        stats.leagues = leagues.length;
        console.log(`✅ ${leagues.length} ligas carregadas`);

        // Step 2: Cache all teams for each league
        console.log('👥 Etapa 2/3: Carregando times de cada liga...');
        for (let i = 0; i < leagues.length; i++) {
            const league = leagues[i];
            console.log(`  [${i + 1}/${leagues.length}] Carregando times: ${league.name}...`);

            try {
                const teams = await cacheLeagueTeams(league.externalId, league.currentSeasonId);
                stats.teams += teams.length;

                // Rate limiting
                await sleep(RATE_LIMIT_DELAY);
            } catch (error) {
                console.error(`    ❌ Erro ao carregar times da liga ${league.name}:`, error.message);
                stats.errors++;
            }
        }
        console.log(`✅ ${stats.teams} times carregados`);

        // Step 3: Cache 90 matches for each team (past, current, future)
        console.log('⚽ Etapa 3/3: Carregando histórico de partidas (90 por time)...');
        const teams = await Team.findAll();

        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];

            if ((i + 1) % 10 === 0) {
                console.log(`  Progresso: ${i + 1}/${teams.length} times processados (${stats.matches} partidas)...`);
            }

            try {
                const matches = await cacheTeamHistory(team.externalId, team.league_id);
                stats.matches += matches.length;

                // Update team cache metadata
                await team.update({
                    history_cached_at: new Date(),
                    history_match_count: matches.length
                });

                // Rate limiting - pause every batch
                if ((i + 1) % BATCH_SIZE === 0) {
                    console.log(`  ⏸️  Pausando por ${BATCH_DELAY / 1000}s após ${BATCH_SIZE} times (rate limit)...`);
                    await sleep(BATCH_DELAY);
                } else {
                    await sleep(RATE_LIMIT_DELAY);
                }
            } catch (error) {
                console.error(`    ❌ Erro ao carregar histórico do time ${team.name}:`, error.message);
                stats.errors++;
            }
        }

        // Step 4: Cache matches by date (last 30 days + next 30 days)
        console.log('📅 Etapa 4/4: Carregando partidas recentes e próximas (últimos 30 dias + próximos 30 dias)...');
        try {
            const dateMatches = await cacheMatchesByDateRange();
            stats.matches += dateMatches;
            console.log(`✅ ${dateMatches} partidas por data carregadas`);
        } catch (error) {
            console.error('❌ Erro ao carregar partidas por data:', error.message);
            stats.errors++;
        }

        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Cache warming completo em ${duration}s`);
        console.log(`   📊 Estatísticas:`);
        console.log(`      - Ligas: ${stats.leagues}`);
        console.log(`      - Times: ${stats.teams}`);
        console.log(`      - Partidas: ${stats.matches}`);
        console.log(`      - Erros: ${stats.errors}`);

        return stats;
    } catch (error) {
        console.error('❌ Erro crítico no cache warming:', error.message);
        throw error;
    }
};

/**
 * Perform incremental update - only refresh stale data
 */
export const performIncrementalUpdate = async () => {
    console.log('🔄 Realizando atualização incremental do cache...');

    let stats = {
        leagues: 0,
        teams: 0,
        matches: 0,
        updated: 0
    };

    try {
        // Update live matches
        const liveMatches = await updateLiveMatches();
        stats.matches = liveMatches;

        // Find stale cache entries
        const staleThreshold = new Date(Date.now() - CACHE_TTL.TEAM_HISTORY);
        const staleTeams = await Team.findAll({
            where: {
                [Op.or]: [
                    { history_cached_at: { [Op.lt]: staleThreshold } },
                    { history_cached_at: null }
                ]
            },
            limit: 50 // Update max 50 teams per incremental update
        });

        console.log(`📊 ${staleTeams.length} times com cache desatualizado`);

        for (const team of staleTeams) {
            try {
                const matches = await cacheTeamHistory(team.externalId, team.league_id);
                stats.updated++;
                await team.update({
                    history_cached_at: new Date(),
                    history_match_count: matches.length
                });
                await sleep(RATE_LIMIT_DELAY);
            } catch (error) {
                console.error(`Erro ao atualizar time ${team.name}:`, error.message);
            }
        }

        console.log(`✅ Atualização incremental concluída: ${stats.updated} times atualizados`);
        return stats;
    } catch (error) {
        console.error('Erro na atualização incremental:', error.message);
        return stats;
    }
};

/**
 * Cache all priority leagues
 */
const cachePriorityLeagues = async () => {
    try {
        let allLeagues = [];
        let page = 1;
        let hasMore = true;

        // Fetch all pages of leagues
        console.log('📋 Buscando todas as ligas da API (com paginação)...');

        while (hasMore) {
            const url = `${BASE_URL}/leagues?api_token=${token}&include=country;seasons&page=${page}`;
            const { data } = await axios.get(url);
            const leagues = data.data || [];

            allLeagues = allLeagues.concat(leagues);

            // Check if there are more pages - SportMonks V3 uses 'has_more' flag
            const pagination = data.pagination;
            if (pagination && pagination.has_more === true) {
                page++;
                console.log(`  Página ${page - 1} carregada - ${allLeagues.length} ligas até agora...`);
                await sleep(RATE_LIMIT_DELAY); // Rate limiting between pages
            } else {
                hasMore = false;
            }
        }

        console.log(`📋 ${allLeagues.length} ligas encontradas na API (${page} páginas)`);

        const cachedLeagues = [];

        for (const league of allLeagues) {
            try {
                const priority = calculateLeaguePriority(league.name, league.country?.name);

                // Find current season from seasons array
                let currentSeasonId = null;
                if (league.seasons && league.seasons.length > 0) {
                    // Try to find active/current season
                    const currentSeason = league.seasons.find(s => s.is_current === true);
                    if (currentSeason) {
                        currentSeasonId = currentSeason.id;
                    } else {
                        // Fallback: use most recent season (highest ID)
                        const sortedSeasons = [...league.seasons].sort((a, b) => b.id - a.id);
                        currentSeasonId = sortedSeasons[0].id;
                    }
                }

                const [leagueRecord] = await League.upsert({
                    externalId: league.id,
                    name: league.name,
                    country: league.country?.name || 'International',
                    logo: league.image_path,
                    flag: league.country?.image_path,
                    currentSeasonId: currentSeasonId,
                    active: true,
                    cache_priority: priority,
                    cache_status: 'pending'
                });

                // Create/update cache metadata
                await CacheMetadata.upsert({
                    resource_type: 'league',
                    resource_id: String(league.id),
                    league_id: league.id,
                    last_updated: new Date(),
                    status: 'fresh',
                    expires_at: new Date(Date.now() + CACHE_TTL.LEAGUE_DATA)
                });

                cachedLeagues.push(leagueRecord);
            } catch (error) {
                console.error(`Erro ao cachear liga ${league.name}:`, error.message);
            }
        }

        return cachedLeagues;
    } catch (error) {
        console.error('Erro ao buscar ligas:', error.message);
        return [];
    }
};

/**
 * Cache all teams for a specific league
 */
const cacheLeagueTeams = async (leagueId, seasonId) => {
    if (!seasonId) {
        console.log(`  ⚠️  Liga ${leagueId} sem currentSeasonId - pulando times`);
        return [];
    }

    try {
        // Fetch teams from standings (most reliable source)
        const url = `${BASE_URL}/standings/seasons/${seasonId}?api_token=${token}&include=participant`;
        const { data } = await axios.get(url);
        const standings = data.data || [];

        const cachedTeams = [];

        for (const standing of standings) {
            const participant = standing.participant;
            if (!participant) continue;

            try {
                const [teamRecord] = await Team.upsert({
                    externalId: participant.id,
                    name: participant.name,
                    logo: participant.image_path,
                    league_id: leagueId
                });

                cachedTeams.push(teamRecord);
            } catch (error) {
                console.error(`    Erro ao cachear time ${participant.name}:`, error.message);
            }
        }

        // Update league team count
        await League.update(
            {
                team_count: cachedTeams.length,
                teams_cached_at: new Date()
            },
            { where: { externalId: leagueId } }
        );

        return cachedTeams;
    } catch (error) {
        console.error(`Erro ao buscar times da liga ${leagueId}:`, error.message);
        return [];
    }
};

/**
 * Cache 90 matches for a team (30 past, 30 current, 30 future)
 */
const cacheTeamHistory = async (teamId, leagueId) => {
    try {
        // Calculate date range: 6 months back, 6 months forward
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // Fetch fixtures for team in date range
        const url = `${BASE_URL}/fixtures/between/${startStr}/${endStr}/${teamId}?api_token=${token}&include=participants;scores;state;league`;
        const { data } = await axios.get(url);
        let fixtures = data.data || [];

        // Sort by date and limit to 90 matches (balanced across past/future)
        fixtures.sort((a, b) => new Date(a.starting_at) - new Date(b.starting_at));

        // Try to get balanced selection
        const now = new Date();
        const pastFixtures = fixtures.filter(f => new Date(f.starting_at) < now).slice(-30);
        const futureFixtures = fixtures.filter(f => new Date(f.starting_at) >= now).slice(0, 60);

        fixtures = [...pastFixtures, ...futureFixtures].slice(0, 90);

        const cachedMatches = [];

        for (const fixture of fixtures) {
            try {
                const participants = fixture.participants || [];
                const home = participants.find(p => p.meta?.location === 'home');
                const away = participants.find(p => p.meta?.location === 'away');

                if (!home || !away) continue;

                // Cache match with minimal data (don't fetch full stats yet)
                const [matchRecord] = await Match.upsert({
                    externalId: fixture.id,
                    leagueId: fixture.league?.id || leagueId,
                    date: new Date(fixture.starting_at),
                    status: fixture.state?.state || 'NS',
                    homeTeamName: home.name,
                    awayTeamName: away.name,
                    homeScore: 0,
                    awayScore: 0,
                    data: null, // Will be populated on-demand when user requests
                    cached_at: new Date(),
                    cache_source: 'precache',
                    team_ids: [home.id, away.id],
                    fixture_date: new Date(fixture.starting_at)
                });

                cachedMatches.push(matchRecord);
            } catch (error) {
                console.error(`      Erro ao cachear partida ${fixture.id}:`, error.message);
            }
        }

        // Update metadata
        await CacheMetadata.upsert({
            resource_type: 'team_history',
            resource_id: String(teamId),
            league_id: leagueId,
            last_updated: new Date(),
            match_count: cachedMatches.length,
            status: 'fresh',
            expires_at: new Date(Date.now() + CACHE_TTL.TEAM_HISTORY)
        });

        return cachedMatches;
    } catch (error) {
        console.error(`Erro ao cachear histórico do time ${teamId}:`, error.message);
        return [];
    }
};

/**
 * Update currently live matches
 */
export const updateLiveMatches = async () => {
    try {
        console.log('🔴 Atualizando partidas ao vivo...');

        const url = `${BASE_URL}/livescores/inplay?api_token=${token}&include=participants;scores;state;league`;
        const { data } = await axios.get(url);
        const liveFixtures = data.data || [];

        console.log(`  ${liveFixtures.length} partidas ao vivo encontradas`);

        for (const fixture of liveFixtures) {
            try {
                // Fetch full match stats for live matches
                await getMatchStats(fixture.id);
            } catch (error) {
                console.error(`  Erro ao atualizar partida ao vivo ${fixture.id}:`, error.message);
            }
        }

        return liveFixtures.length;
    } catch (error) {
        // 404 is normal when no live matches
        if (error.response?.status === 404) {
            console.log('  Nenhuma partida ao vivo no momento');
            return 0;
        }
        console.error('Erro ao atualizar partidas ao vivo:', error.message);
        return 0;
    }
};

/**
 * Calculate league priority (same as fixture.service.js)
 */
const calculateLeaguePriority = (leagueName, countryName) => {
    const name = (leagueName || '').toLowerCase();
    const country = (countryName || '').toLowerCase();

    // Priority 10: Copa Libertadores, Copa Sudamericana
    if (name.includes('libertadores') || name.includes('sudamericana')) {
        return 10;
    }

    // Priority 9: Brazilian competitions
    if (country === 'brazil' || name.includes('brasileir') || name.includes('copa do brasil')) {
        return 9;
    }

    // Priority 8: Top European leagues
    if (name.includes('premier league') ||
        name.includes('la liga') ||
        name.includes('serie a') && country === 'italy' ||
        name.includes('bundesliga') ||
        name.includes('ligue 1')) {
        return 8;
    }

    // Priority 7: Champions League, Europa League
    if (name.includes('champions') || name.includes('europa league')) {
        return 7;
    }

    // Priority 6: Other South American leagues
    if (country === 'argentina' || country === 'uruguay' ||
        country === 'colombia' || country === 'chile' ||
        country === 'paraguay' || country === 'peru' ||
        country === 'ecuador' || country === 'bolivia' ||
        country === 'venezuela') {
        return 6;
    }

    // Priority 5: Other European leagues
    if (country === 'england' || country === 'spain' ||
        country === 'italy' || country === 'germany' ||
        country === 'france' || country === 'portugal' ||
        country === 'netherlands') {
        return 5;
    }

    // Default priority
    return 1;
};

/**
 * Get cache status statistics
 */
export const getCacheStatus = async () => {
    try {
        const [
            totalLeagues,
            cachedLeagues,
            totalTeams,
            totalMatches,
            freshMatches,
            staleMatches
        ] = await Promise.all([
            League.count(),
            League.count({ where: { cache_status: 'cached' } }),
            Team.count(),
            Match.count(),
            Match.count({
                where: {
                    cached_at: {
                        [Op.gte]: new Date(Date.now() - CACHE_TTL.FINISHED_MATCH)
                    }
                }
            }),
            Match.count({
                where: {
                    cached_at: {
                        [Op.lt]: new Date(Date.now() - CACHE_TTL.FINISHED_MATCH)
                    }
                }
            })
        ]);

        const hitRate = totalMatches > 0
            ? ((freshMatches / totalMatches) * 100).toFixed(1)
            : '0.0';

        return {
            status: 'healthy',
            leagues: {
                total: totalLeagues,
                cached: cachedLeagues,
                pending: totalLeagues - cachedLeagues
            },
            teams: {
                total: totalTeams
            },
            matches: {
                total: totalMatches,
                fresh: freshMatches,
                stale: staleMatches,
                cache_hit_rate: `${hitRate}%`
            },
            last_update: new Date().toISOString()
        };
    } catch (error) {
        console.error('Erro ao obter status do cache:', error.message);
        return {
            status: 'error',
            error: error.message
        };
    }
};

/**
 * Clear cache (admin function)
 */
export const clearCache = async (resourceType = null) => {
    try {
        if (resourceType) {
            await CacheMetadata.destroy({ where: { resource_type: resourceType } });

            if (resourceType === 'match') {
                await Match.destroy({ where: {} });
            } else if (resourceType === 'team_history') {
                await Team.update({ history_cached_at: null, history_match_count: 0 }, { where: {} });
            } else if (resourceType === 'league') {
                await League.update({ cache_status: 'pending', teams_cached_at: null }, { where: {} });
            }

            console.log(`✅ Cache limpo: ${resourceType}`);
        } else {
            await CacheMetadata.destroy({ where: {} });
            await Match.destroy({ where: {} });
            await Team.update({ history_cached_at: null, history_match_count: 0 }, { where: {} });
            await League.update({ cache_status: 'pending', teams_cached_at: null }, { where: {} });

            console.log('✅ Todo o cache foi limpo');
        }

        return { success: true };
    } catch (error) {
        console.error('Erro ao limpar cache:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Utility: Sleep function for rate limiting
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility: Calculate MD5 hash for data change detection
 */
export const calculateDataHash = (data) => {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};


/**
 * Cache matches by date range (last 30 days + next 30 days)
 */
const cacheMatchesByDateRange = async () => {
    try {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 30);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        console.log(`  Buscando partidas de ${startStr} até ${endStr}...`);
        
        let cachedCount = 0;
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            try {
                const url = `${BASE_URL}/fixtures/date/${dateStr}?api_token=${token}&include=participants;scores;state;league`;
                const { data } = await axios.get(url);
                const fixtures = data.data || [];
                
                if (fixtures.length > 0) {
                    console.log(`  📅 ${dateStr}: ${fixtures.length} partidas`);
                    
                    for (const fixture of fixtures) {
                        try {
                            const participants = fixture.participants || [];
                            const homeTeam = participants.find(p => p.meta?.location === 'home');
                            const awayTeam = participants.find(p => p.meta?.location === 'away');
                            
                            if (!homeTeam || !awayTeam) continue;
                            
                            const scores = fixture.scores || [];
                            const homeScore = scores.find(s => s.participant_id === homeTeam.id);
                            const awayScore = scores.find(s => s.participant_id === awayTeam.id);
                            
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
                            // Silent fail
                        }
                    }
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
                await sleep(RATE_LIMIT_DELAY);
                
            } catch (error) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        console.log(`  ✅ ${cachedCount} partidas cachadas por data`);
        return cachedCount;
    } catch (error) {
        console.error('Erro ao cachear por data:', error.message);
        return 0;
    }
};
