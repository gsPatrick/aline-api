const express = require('express');
const router = express.Router();

// --- IMPORTAÇÃO DAS FEATURES (SEUS ARQUIVOS) ---
const TeamFixtures = require('./features/teamFixtures/TeamFixtures');
const TeamCompetitions = require('./features/teamCompetitions/TeamCompetitions');
const MatchAnalysis = require('./features/matchAnalysis/MatchAnalysis');

// Adicione novas features nesta lista conforme for criando
const features = [
    TeamFixtures,       // Exporta um Array de rotas (Next, Last, Schedule)
    TeamCompetitions,   // Exporta um Objeto único
    MatchAnalysis       // Exporta um Objeto único
];

// --- LÓGICA DE REGISTRO AUTOMÁTICO ---
console.log('--- Registrando Rotas SportMonks ---');

features.forEach(feature => {
    // 1. Normaliza: Se for um objeto único, transforma em array para o loop funcionar igual
    const routes = Array.isArray(feature) ? feature : [feature];

    routes.forEach(route => {
        try {
            const method = route.method.toLowerCase(); // 'get', 'post', etc.
            const path = route.path;
            const handler = route.handler;

            // 2. Registra no Router do Express
            // Equivalente a: router.get('/url', handler)
            if (router[method]) {
                router[method](path, handler);
                console.log(`[OK] Rota registrada: [${method.toUpperCase()}] ${path}`);
            } else {
                console.warn(`[AVISO] Método HTTP inválido na rota: ${path}`);
            }
        } catch (error) {
            console.error(`[ERRO] Falha ao registrar rota do SportMonks:`, error);
        }
    });
});
console.log('--------------------------------------');

module.exports = router;