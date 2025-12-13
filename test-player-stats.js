/**
 * TEST: Verificar estatísticas de jogadores disponíveis na API SportMonks
 * 
 * Execute com: node test-player-stats.js
 */

import 'dotenv/config';
import axios from 'axios';

const API_TOKEN = process.env.SPORTMONKS_API_TOKEN;
const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Fixture ID de exemplo (Corinthians vs Cruzeiro - ou qualquer partida recente)
const FIXTURE_ID = 19596089; // Substitua por um ID válido

// Mapeamento de type_ids para nomes de estatísticas
const STAT_TYPE_IDS = {
    // Shots
    42: 'Shots Total',
    86: 'Shots on Target',
    99: 'Shots Off Target',
    57: 'Shots Blocked',
    41: 'Shots Inside Box',

    // Tackles & Defense
    79: 'Tackles',
    80: 'Interceptions',
    81: 'Clearances',
    97: 'Blocks',

    // Passing
    77: 'Passes',
    78: 'Accurate Passes',
    116: 'Long Balls',
    118: 'Crosses',

    // Fouls & Cards
    56: 'Fouls',
    83: 'Red Cards',
    84: 'Yellow Cards',
    88: 'Yellow Cards (conceded)',

    // Goals & Assists
    52: 'Goals',
    79: 'Assists',

    // Other
    37: 'Offsides',
    60: 'Saves (Goalkeeper)',
    45: 'Possession %',
    51: 'Corners',
    34: 'Corners (type 34)',

    // xG
    5304: 'Expected Goals (xG)',
    5305: 'Expected Assists (xA)',
    9685: 'xG Chain',

    // Ratings
    211: 'Player Rating',

    // Duels
    105: 'Duels Won',
    106: 'Duels Lost',
    107: 'Aerial Duels Won',

    // Advanced
    108: 'Dispossessed',
    112: 'Dribbles Attempted',
    113: 'Dribbles Success',
    114: 'Key Passes',

    // Team Stats
    1677: 'Shots Summary',
};

async function testEndpoint(name, url) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Testando: ${name}`);
    console.log(`📍 URL: ${url.replace(API_TOKEN, 'API_TOKEN')}`);

    try {
        const response = await axios.get(url);
        const data = response.data;

        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Rate Limit Remaining: ${data.rate_limit?.remaining || 'N/A'}`);
        console.log(`⏱️  Reset in: ${data.rate_limit?.resets_in_seconds || 'N/A'}s`);

        if (data.data) {
            if (Array.isArray(data.data)) {
                console.log(`📦 Resultados: ${data.data.length} items`);
                if (data.data[0]) {
                    console.log(`🔑 Campos disponíveis:`, Object.keys(data.data[0]).join(', '));
                }
            } else {
                console.log(`📦 Tipo de dados: objeto`);
                console.log(`🔑 Campos disponíveis:`, Object.keys(data.data).join(', '));
            }
        }

        return { success: true, data: data.data };
    } catch (error) {
        console.log(`❌ Erro: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        return { success: false, error: error.message };
    }
}

async function analyzeStatistics(statistics) {
    console.log('\n📈 ESTATÍSTICAS ENCONTRADAS:');
    console.log('-'.repeat(60));

    const foundStats = new Map();

    for (const stat of statistics) {
        const typeId = stat.type_id;
        const typeName = STAT_TYPE_IDS[typeId] || `Unknown (${typeId})`;

        if (!foundStats.has(typeId)) {
            foundStats.set(typeId, {
                name: typeName,
                count: 0,
                sample: stat
            });
        }
        foundStats.get(typeId).count++;
    }

    // Ordenar por type_id
    const sorted = [...foundStats.entries()].sort((a, b) => a[0] - b[0]);

    for (const [typeId, info] of sorted) {
        const value = info.sample.data?.value ?? info.sample.value ?? 'N/A';
        console.log(`  [${typeId}] ${info.name}: ${value} (${info.count}x)`);
    }

    return foundStats;
}

async function main() {
    console.log('🚀 TESTE DE ESTATÍSTICAS SPORTMONKS API');
    console.log('='.repeat(60));
    console.log(`🔑 API Token: ${API_TOKEN ? '✅ Configurado' : '❌ NÃO ENCONTRADO'}`);

    if (!API_TOKEN) {
        console.error('❌ Configure SPORTMONKS_API_TOKEN no .env');
        process.exit(1);
    }

    // Lista de estatísticas que queremos verificar
    const WANTED_STATS = [
        'Shots (First Half)',
        'Shots on Target',
        'Blocked Shots',
        'Hit Woodwork',
        'Tackles',
        'Interceptions',
        'Dispossessed',
        'Duels',
        'Fouls Committed',
        'Fouls Committed (First Half)',
        'Fouls Drawn',
        'Foul Involvements',
        'Passes',
        'Accurate Passes',
        'Yellow Cards',
        'Red Cards',
        'Goals',
        'Assists',
        'Goal Involvements',
        'Expected Goals (xG)',
        'Offsides',
        'Crosses',
        'Player Ratings',
        'Goalkeeper Saves',
        'Clearances',
        'Team Total Stats',
        'Against Stats'
    ];

    console.log('\n📋 ESTATÍSTICAS DESEJADAS:');
    WANTED_STATS.forEach(stat => console.log(`  - ${stat}`));

    // 1. Testar estatísticas de time por temporada (FUNCIONA!)
    console.log('\n\n📋 TESTE 1: Estatísticas de time na temporada (Corinthians)');
    const TEAM_ID = 131; // Corinthians
    const teamStatsResult = await testEndpoint(
        'Team Season Statistics',
        `${BASE_URL}/statistics/seasons/teams/${TEAM_ID}?api_token=${API_TOKEN}`
    );

    if (teamStatsResult.success && teamStatsResult.data?.length > 0) {
        console.log('\n📊 ESTATÍSTICAS DE TIME DISPONÍVEIS:');
        console.log('-'.repeat(60));

        const allStats = [];
        for (const season of teamStatsResult.data) {
            if (season.details) {
                for (const detail of season.details) {
                    allStats.push({
                        type_id: detail.type_id,
                        value: detail.value
                    });
                }
            }
        }

        // Agrupar por type_id único
        const uniqueTypes = new Map();
        for (const stat of allStats) {
            if (!uniqueTypes.has(stat.type_id)) {
                uniqueTypes.set(stat.type_id, stat.value);
            }
        }

        console.log(`\n✅ Total de tipos de estatísticas: ${uniqueTypes.size}`);
        console.log('\n🔢 TODOS OS TYPE_IDS ENCONTRADOS:');
        const sortedTypes = [...uniqueTypes.entries()].sort((a, b) => a[0] - b[0]);
        for (const [typeId, value] of sortedTypes) {
            const typeName = STAT_TYPE_IDS[typeId] || 'DESCONHECIDO';
            const sampleValue = typeof value === 'object' ? JSON.stringify(value).slice(0, 50) + '...' : value;
            console.log(`  [${typeId}] ${typeName} = ${sampleValue}`);
        }
    }

    // 2. Testar estatísticas de jogador por temporada (FUNCIONA!)
    console.log('\n\n📋 TESTE 2: Estatísticas de jogador na temporada (Yuri Alberto)');
    const PLAYER_ID = 175117; // Yuri Alberto
    const playerStatsResult = await testEndpoint(
        'Player Season Statistics',
        `${BASE_URL}/statistics/seasons/players/${PLAYER_ID}?api_token=${API_TOKEN}`
    );

    if (playerStatsResult.success && playerStatsResult.data?.length > 0) {
        console.log('\n📊 ESTATÍSTICAS DE JOGADOR DISPONÍVEIS:');
        console.log('-'.repeat(60));

        for (const season of playerStatsResult.data.slice(0, 2)) {
            console.log(`\n📅 Season ID: ${season.season_id}`);
            if (season.details) {
                for (const detail of season.details.slice(0, 15)) {
                    const typeName = STAT_TYPE_IDS[detail.type_id] || `Type ${detail.type_id}`;
                    const value = detail.value?.total ?? detail.value?.count ?? JSON.stringify(detail.value).slice(0, 30);
                    console.log(`  [${detail.type_id}] ${typeName} = ${value}`);
                }
            }
        }
    }

    // 3. Testar fixture com estatísticas (pode dar rate limit)
    console.log('\n\n📋 TESTE 3: Fixture com estatísticas');
    const fixtureResult = await testEndpoint(
        'Fixture Statistics',
        `${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=statistics`
    );

    if (fixtureResult.success && fixtureResult.data?.statistics) {
        console.log('\n📊 ESTATÍSTICAS DO JOGO:');
        await analyzeStatistics(fixtureResult.data.statistics);
    }

    // 4. Testar fixture com lineups
    console.log('\n\n📋 TESTE 4: Fixture com lineups');
    const lineupsResult = await testEndpoint(
        'Fixture Lineups',
        `${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=lineups`
    );

    if (lineupsResult.success && lineupsResult.data?.lineups) {
        console.log(`\n👥 Jogadores escalados: ${lineupsResult.data.lineups.length}`);
    }

    // 5. Testar fixture com eventos
    console.log('\n\n📋 TESTE 5: Fixture com eventos');
    const eventsResult = await testEndpoint(
        'Fixture Events',
        `${BASE_URL}/fixtures/${FIXTURE_ID}?api_token=${API_TOKEN}&include=events`
    );

    if (eventsResult.success && eventsResult.data?.events) {
        console.log(`\n⚽ Eventos na partida: ${eventsResult.data.events.length}`);
        const eventTypes = new Map();
        for (const event of eventsResult.data.events) {
            const type = event.type_id;
            eventTypes.set(type, (eventTypes.get(type) || 0) + 1);
        }
        console.log('📊 Tipos de eventos:');
        for (const [type, count] of eventTypes) {
            console.log(`  [${type}] ${count}x`);
        }
    }

    // RESUMO FINAL
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 RESUMO - ESTATÍSTICAS DISPONÍVEIS NO SEU PLANO');
    console.log('='.repeat(60));

    const availableStats = {
        '✅ DISPONÍVEL': [
            'Team Season Statistics (estatísticas agregadas por temporada)',
            'Player Season Statistics (por jogador na temporada)',
            'Fixture Statistics (estatísticas da partida)',
            'Fixture Lineups (escalações)',
            'Fixture Events (gols, cartões, etc)',
            'Goals, Assists, Yellow/Red Cards',
            'Shots, Shots on Target, Blocked Shots',
            'Passes, Accurate Passes',
            'Corners, Fouls, Offsides',
            'Player Ratings',
            'Possession %',
            'Tackles, Clearances, Interceptions (agregado)',
        ],
        '⚠️ PARCIAL': [
            'Shots First Half (precisa calcular via events)',
            'Fouls Committed First Half (precisa calcular via events)',
            'Fouls Drawn (pode não ter separado)',
            'Foul Involvements (precisa calcular)',
            'Goal Involvements (precisa somar Goals + Assists)',
            'Against Stats (precisa calcular contra adversários)',
        ],
        '❌ NÃO DISPONÍVEL': [
            'Expected Lineups (xG) - precisa de add-on Premium',
            'Dispossessed (não encontrado)',
            'Duels Won/Lost (não encontrado)',
            'Hit Woodwork (não encontrado)',
            'Crosses (não encontrado diretamente)',
        ]
    };

    for (const [status, stats] of Object.entries(availableStats)) {
        console.log(`\n${status}:`);
        for (const stat of stats) {
            console.log(`  - ${stat}`);
        }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ TESTE CONCLUÍDO!');
    console.log('='.repeat(60));
}

main().catch(console.error);
