import axios from 'axios';

const API_TOKEN = 'Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh';
const BASE_URL = 'https://api.sportmonks.com/v3/football';

async function runTest() {
    try {
        console.log("1. Buscando jogo recente da Premier League (ID 8) para análise...");

        // Buscar jogos dos últimos 7 dias
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        const startStr = lastWeek.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];

        // Filter by date range
        const fixturesUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state&filters=fixtureLeagues:8`;
        const fixturesResponse = await axios.get(fixturesUrl);

        // Pegar um jogo FINALIZADO (FT) ou LIVE
        let fixture = fixturesResponse.data.data.find(f => f.state.state === 'LIVE' || f.state.state === 'HT' || f.state.state === 'FT');

        if (!fixture) {
            console.log("Nenhum jogo recente encontrado na Premier League. Tentando qualquer liga...");
            const anyFixtureUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state`;
            const anyResp = await axios.get(anyFixtureUrl);
            fixture = anyResp.data.data.find(f => f.state.state === 'FT' || f.state.state === 'LIVE');
        }

        if (!fixture) {
            console.error("Nenhum jogo encontrado para teste.");
            return;
        }

        console.log(`Jogo Selecionado: ${fixture.name} (ID: ${fixture.id}) - Data: ${fixture.starting_at}`);

        // 2. Buscar Detalhes com Includes Específicos
        // Tentando includes que podem conter Momentum/Pressure e Action Zones
        // 'statistics' é o padrão. 'pressure-stats' é um chute. 'events' pode ter algo.
        // Na v3, action zones muitas vezes vêm dentro de statistics com type específico.
        console.log("2. Buscando estatísticas detalhadas...");

        const detailsUrl = `${BASE_URL}/fixtures/${fixture.id}?api_token=${API_TOKEN}&include=statistics.type;events.type;trends;comments`;
        const detailsResp = await axios.get(detailsUrl);
        const data = detailsResp.data.data;

        // DEBUG: Logar estrutura bruta
        console.log("\n--- DEBUG: ESTRUTURA BRUTA ---");
        if (data.statistics && data.statistics.length > 0) {
            console.log("Exemplo de Stat:", JSON.stringify(data.statistics[0], null, 2));
            const statNames = [...new Set(data.statistics.map(s => s.type?.name))];
            console.log("Nomes de Stats encontrados:", statNames.join(', '));
        } else {
            console.log("Nenhuma estatística encontrada no array 'statistics'.");
        }

        if (data.events && data.events.length > 0) {
            console.log("Exemplo de Evento:", JSON.stringify(data.events[0], null, 2));
        } else {
            console.log("Nenhum evento encontrado.");
        }

        if (data.trends && data.trends.length > 0) {
            console.log("Exemplo de Trend:", JSON.stringify(data.trends[0], null, 2));
        } else {
            console.log("Nenhuma trend encontrada.");
        }

        // 3. Analisar "Momentum" / Pressão via Trends
        console.log("\n--- ANÁLISE DE MOMENTUM (VIA TRENDS) ---");

        // Mapear Type IDs dos stats para nomes
        const typeMap = {};
        if (data.statistics) {
            data.statistics.forEach(s => {
                if (s.type) typeMap[s.type.id] = s.type.name;
            });
        }

        // Se trends tiver type_id, tentar descobrir o nome
        if (data.trends) {
            const trendTypes = [...new Set(data.trends.map(t => t.type_id))];
            console.log("Trend Type IDs encontrados:", trendTypes.join(', '));

            trendTypes.forEach(id => {
                const name = typeMap[id] || "Desconhecido";
                console.log(`Trend ID ${id}: ${name}`);
            });

            // Tentar achar trend de Dangerous Attacks
            const dangerousAttackStat = data.statistics.find(s => s.type.name === 'Dangerous Attacks');
            if (dangerousAttackStat) {
                const daId = dangerousAttackStat.type.id;
                console.log(`ID de Dangerous Attacks: ${daId}`);

                const daTrends = data.trends.filter(t => t.type_id === daId);
                console.log(`Trends de Dangerous Attacks encontrados: ${daTrends.length}`);
                if (daTrends.length > 0) {
                    console.log("Exemplo de Trend DA:", JSON.stringify(daTrends[0], null, 2));

                    // Montar Pressure Chart Mockado com base nisso?
                    // Trends geralmente são "X nos últimos Y minutos".
                    // Se tivermos isso, podemos usar.
                }
            }
        }

        // 4. Analisar "Action Zones"
        console.log("\n--- ANÁLISE DE ACTION ZONES ---");
        const stats = data.statistics || [];

        // Procurar por stats que pareçam zonas
        const zoneStats = stats.filter(s =>
            s.type.name.toLowerCase().includes('zone') ||
            s.type.name.toLowerCase().includes('action') ||
            s.type.name.toLowerCase().includes('third')
        );

        if (zoneStats.length > 0) {
            console.log("Encontrado Stats de Zonas:", JSON.stringify(zoneStats, null, 2));
        } else {
            console.log("Nenhum stat explícito de 'Zone' encontrado. Verificando nomes de stats disponíveis...");
            // Listar alguns nomes para ver se achamos algo parecido
            const statNames = [...new Set(stats.map(s => s.type.name))];
            console.log("Stats Disponíveis:", statNames.slice(0, 20).join(', '));
        }

        // 5. Tentar Montar o JSON Desejado
        const result = {
            chartsAnalysis: {
                pressure: [], // TBD
                attackZones: {
                    home: { defense: 0, middle: 0, attack: 0 },
                    away: { defense: 0, middle: 0, attack: 0 }
                }
            }
        };

        // Simulação de lógica se não achar direto
        // Se acharmos 'Ball Possession %' ou 'Dangerous Attacks', podemos inferir algo?
        // Mas o usuário quer "Action Zones" (Own Third, Middle Third, Final Third).
        // Na v2 isso existia. Na v3, pode ser um include diferente ou statistics specific.

        console.log("\n--- RESULTADO FINAL (JSON) ---");
        console.log(JSON.stringify(result, null, 2));

        console.log("\n--- RESPOSTAS WEBSOCKET ---");
        console.log("Analisando...");

    } catch (error) {
        console.error("Erro no teste:", error.message);
        if (error.response) {
            console.error("Detalhes:", error.response.data);
        }
    }
}

runTest();
