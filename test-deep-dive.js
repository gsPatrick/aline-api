import axios from 'axios';

const API_TOKEN = 'Xql7ZNMOjdE1pxn7FOh4739UX07owQNA2dNDguw0K6p881Q8yhlInKkHgEgh';
const BASE_URL = 'https://api.sportmonks.com/v3/football';

async function runDeepDive() {
    try {
        console.log("1. Buscando jogo Tier 1 (Premier League - ID 8) FINALIZADO recentíssimo...");

        // Buscar jogos dos últimos 14 dias para garantir um jogo grande
        const today = new Date();
        const lastWeeks = new Date(today);
        lastWeeks.setDate(today.getDate() - 14);

        const startStr = lastWeeks.toISOString().split('T')[0];
        const endStr = today.toISOString().split('T')[0];

        // Premier League (8) ou Champions League (2)
        const fixturesUrl = `${BASE_URL}/fixtures/between/${startStr}/${endStr}?api_token=${API_TOKEN}&include=league;participants;state&filters=fixtureLeagues:8,2`;
        const fixturesResponse = await axios.get(fixturesUrl);

        // Priorizar jogos de times grandes se possível, ou apenas o mais recente FT
        // Vamos pegar o primeiro FT que encontrarmos
        let fixture = fixturesResponse.data.data.find(f => f.state.state === 'FT');

        if (!fixture) {
            console.error("Nenhum jogo Tier 1 encontrado nos últimos 14 dias. Expandindo busca...");
            return;
        }

        console.log(`\n=== JOGO SELECIONADO ===`);
        console.log(`${fixture.name} (ID: ${fixture.id})`);
        console.log(`Liga: ${fixture.league.name}`);
        console.log(`Data: ${fixture.starting_at}`);
        console.log(`Estado: ${fixture.state.state}`);

        // 2. Request Deep Dive
        console.log("\n2. Executando Request Deep Dive (Statistics, Trends, Events)...");
        const detailsUrl = `${BASE_URL}/fixtures/${fixture.id}?api_token=${API_TOKEN}&include=statistics.type;trends.type;events.type`;
        const detailsResp = await axios.get(detailsUrl);
        const data = detailsResp.data.data;

        // 3. Varredura de Estatísticas (Action Zones)
        console.log("\n=== VARREDURA DE ESTATÍSTICAS (ACTION ZONES) ===");
        const stats = data.statistics || [];
        if (stats.length === 0) console.log("Nenhuma estatística retornada.");

        // Agrupar por nome para facilitar leitura
        const uniqueStats = {};
        stats.forEach(s => {
            const name = s.type?.name || "Unknown";
            const val = s.data?.value ?? s.value;
            const teamId = s.participant_id;

            if (!uniqueStats[name]) uniqueStats[name] = [];
            uniqueStats[name].push({ team: teamId, value: val });
        });

        // Listar TUDO
        Object.keys(uniqueStats).sort().forEach(name => {
            const values = uniqueStats[name].map(v => `${v.value}`).join(' vs ');
            console.log(`[STAT] ${name}: ${values}`);
        });

        // 4. Varredura de Trends (Momentum)
        console.log("\n=== VARREDURA DE TRENDS (MOMENTUM) ===");
        const trends = data.trends || [];
        if (trends.length === 0) console.log("Nenhum trend retornado.");

        const uniqueTrends = {};
        trends.forEach(t => {
            const name = t.type?.name || `TypeID_${t.type_id}`;
            if (!uniqueTrends[name]) uniqueTrends[name] = 0;
            uniqueTrends[name]++;
        });

        Object.keys(uniqueTrends).sort().forEach(name => {
            console.log(`[TREND] ${name} (Count: ${uniqueTrends[name]})`);
        });

        // 5. Varredura de Eventos (Dangerous Attacks)
        console.log("\n=== VARREDURA DE EVENTOS (TIMESTAMPS) ===");
        const events = data.events || [];

        // Procurar eventos que possam indicar pressão
        const pressureEvents = events.filter(e => {
            const name = e.type?.name?.toLowerCase() || "";
            return name.includes("attack") || name.includes("corner") || name.includes("shot") || name.includes("pressure");
        });

        const eventTypes = [...new Set(pressureEvents.map(e => e.type?.name))];
        console.log("Tipos de Eventos de Pressão Encontrados:", eventTypes.join(', '));

        if (pressureEvents.length > 0) {
            console.log(`Total de Eventos de Pressão: ${pressureEvents.length}`);
            console.log("Exemplo (primeiros 3):");
            pressureEvents.slice(0, 3).forEach(e => {
                console.log(`- Min ${e.minute}: ${e.type?.name} (Team ${e.participant_id})`);
            });
        } else {
            console.log("Nenhum evento explícito de 'Attack' ou 'Pressure' encontrado nos events.");
        }

    } catch (error) {
        console.error("Erro Fatal:", error.message);
        if (error.response) console.error("Response Data:", error.response.data);
    }
}

runDeepDive();
