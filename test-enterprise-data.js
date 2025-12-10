import axios from 'axios';

const API_TOKEN = 'Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh';
const BASE_URL = 'https://api.sportmonks.com/v3/football';

async function runEnterpriseTest() {
    try {
        console.log("1. Buscando jogo Tier 1 (Premier League - ID 8) FINALIZADO recentíssimo...");

        // Buscar jogos dos últimos 7 dias
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        const startStr = lastWeek.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];

        const fixturesUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state&filters=fixtureLeagues:8`;
        const fixturesResponse = await axios.get(fixturesUrl);

        let fixture = fixturesResponse.data.data.find(f => f.state.state === 'FT');

        if (!fixture) {
            console.error("Nenhum jogo recente encontrado. Tentando Champions League (ID 2)...");
            const clUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state&filters=fixtureLeagues:2`;
            const clResp = await axios.get(clUrl);
            fixture = clResp.data.data.find(f => f.state.state === 'FT');
        }

        if (!fixture) {
            console.error("Nenhum jogo encontrado para teste.");
            return;
        }

        console.log(`\n=== JOGO SELECIONADO ===`);
        console.log(`${fixture.name} (ID: ${fixture.id})`);
        console.log(`Data: ${fixture.starting_at}`);

        // 2. Request Enterprise Data (Events with Coordinates)
        console.log("\n2. Buscando Eventos e Stats...");
        // include=events (standard includes usually don't have coords unless enterprise is active/configured)
        // Sometimes coords are in 'details' or specific fields. V3 docs say 'events' have 'position_x', 'position_y'.
        const detailsUrl = `${BASE_URL}/fixtures/${fixture.id}?api_token=${API_TOKEN}&include=events;statistics.type`;
        const detailsResp = await axios.get(detailsUrl);
        const data = detailsResp.data.data;

        // 3. Verificação de Coordenadas
        console.log("\n=== VERIFICAÇÃO DE COORDENADAS (X/Y) ===");
        const events = data.events || [];

        // Filtrar eventos que têm coordenadas
        const eventsWithCoords = events.filter(e => e.position_x !== null && e.position_y !== null && e.position_x !== undefined);

        console.log(`Total de Eventos: ${events.length}`);
        console.log(`Eventos com Coordenadas: ${eventsWithCoords.length}`);

        if (eventsWithCoords.length > 0) {
            console.log("SUCESSO! Coordenadas encontradas.");
            console.log("Exemplo (primeiros 3):");
            eventsWithCoords.slice(0, 3).forEach(e => {
                console.log(`- Min ${e.minute} (${e.type?.name}): X=${e.position_x}, Y=${e.position_y}`);
            });

            // Simulação de Cálculo de Zonas
            console.log("\n--- SIMULAÇÃO DE CÁLCULO DE ZONAS ---");
            const zones = {
                home: { defense: 0, middle: 0, attack: 0, total: 0 },
                away: { defense: 0, middle: 0, attack: 0, total: 0 }
            };

            // Precisamos saber quem é Home e Away para interpretar o X corretamente.
            // Geralmente X=0-50 é defesa de um, 50-100 ataque? Ou sempre relativo ao time?
            // SportMonks Docs: "The x and y coordinates are always from the perspective of the team that performs the event."
            // "0,0 is the bottom left corner of the pitch from the perspective of the team."
            // "X axis is the length of the pitch (0-100). Y axis is the width (0-100)."
            // Se for perspectiva do time: 
            // 0-33: Defesa (Own Third)
            // 34-66: Meio (Middle Third)
            // 67-100: Ataque (Final Third)

            eventsWithCoords.forEach(e => {
                const x = parseFloat(e.position_x);
                const teamId = e.participant_id;

                // Identificar se é home ou away (precisamos dos IDs dos participantes)
                const homeId = fixture.participants.find(p => p.meta.location === 'home').id;
                const awayId = fixture.participants.find(p => p.meta.location === 'away').id;

                let side = null;
                if (teamId === homeId) side = 'home';
                else if (teamId === awayId) side = 'away';

                if (side) {
                    zones[side].total++;
                    if (x < 34) zones[side].defense++;
                    else if (x < 67) zones[side].middle++;
                    else zones[side].attack++;
                }
            });

            console.log("Zonas Calculadas (Counts):", JSON.stringify(zones, null, 2));

            // Percentagens
            const homeTotal = zones.home.total || 1;
            const awayTotal = zones.away.total || 1;

            const result = {
                home: {
                    defense: ((zones.home.defense / homeTotal) * 100).toFixed(0),
                    middle: ((zones.home.middle / homeTotal) * 100).toFixed(0),
                    attack: ((zones.home.attack / homeTotal) * 100).toFixed(0)
                },
                away: {
                    defense: ((zones.away.defense / awayTotal) * 100).toFixed(0),
                    middle: ((zones.away.middle / awayTotal) * 100).toFixed(0),
                    attack: ((zones.away.attack / awayTotal) * 100).toFixed(0)
                }
            };
            console.log("Zonas Finais (%):", JSON.stringify(result, null, 2));

        } else {
            console.log("FALHA: Nenhuma coordenada encontrada nos eventos.");
            console.log("Verifique se o plano Enterprise está ativo ou se o include requer algo mais.");
        }

        // 4. Verificação de Stats Avançados
        console.log("\n=== VERIFICAÇÃO DE STATS AVANÇADOS ===");
        const stats = data.statistics || [];
        const advancedStats = stats.filter(s =>
            s.type?.name?.toLowerCase().includes('zone') ||
            s.type?.name?.toLowerCase().includes('area') ||
            s.type?.name?.toLowerCase().includes('heat')
        );

        if (advancedStats.length > 0) {
            console.log("Stats Avançados Encontrados:", JSON.stringify(advancedStats, null, 2));
        } else {
            console.log("Nenhum stat explícito de 'Zone/Area/Heat' encontrado.");
        }

    } catch (error) {
        console.error("Erro no teste:", error.message);
    }
}

runEnterpriseTest();
