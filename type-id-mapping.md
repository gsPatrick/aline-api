# SportMonks API - Type ID Mapping

## Estatísticas de TIME (participant_id = teamId)

Estas estatísticas são por PARTIDA, por TIME - não por jogador!

| type_id | Nome | Descrição |
|---------|------|-----------|
| 34 | Corners | Escanteios |
| 41 | Shots Inside Box | Chutes dentro da área |
| 42 | Total Shots | Total de finalizações |
| 43 | Passes Total | Total de passes |
| 44 | Passes Accurate | Passes certos |
| 45 | Ball Possession | Posse de bola (%) |
| 46 | Passes % | Precisão de passes (%) |
| 49 | Saves | Defesas do goleiro |
| 50 | Goal Attempts | Tentativas de gol |
| 51 | Offsides | Impedimentos |
| 52 | Goals | Gols |
| 56 | Fouls | Faltas |
| 57 | Shots Blocked | Chutes bloqueados |
| 58 | Shots Off Goal | Chutes para fora |
| 59 | Hit Woodwork | Acertou a trave |
| 64 | Free Kicks | Faltas cobradas |
| 78 | Tackles | Desarmes |
| 80 | Total Passes | Passes totais (outra métrica) |
| 81 | Completed Passes | Passes completos |
| 82 | Pass Accuracy | Precisão de passes |
| 84 | Yellow Cards | Cartões amarelos |
| 86 | Shots On Goal | Chutes no gol |
| 98 | Dangerous Attacks | Ataques perigosos |
| 99 | Missing | ?? |
| 100 | Missing | ?? |
| 108 | Missing | ?? |
| 109 | Missing | ?? |
| 117 | Missing | ?? |
| 1605 | Missing | ?? |

## ⚠️ PROBLEMA IDENTIFICADO

As estatísticas retornadas pelo endpoint `/fixtures/between/{start}/{end}/{teamId}?include=statistics`
são **ESTATÍSTICAS DE TIME**, não de jogadores!

Cada statistic tem:
- `participant_id` = ID do TIME
- `data.value` = valor da estatística

**NÃO TEM `player_id`** nas statistics!

## 📋 Solução: Estatísticas por Jogador

Para ter estatísticas POR JOGADOR, existem 2 opções:

### Opção 1: Season Statistics
```
GET /statistics/seasons/players/{playerId}
```
- Retorna estatísticas AGREGADAS da temporada
- Não é por partida

### Opção 2: Lineups com detalhes
```
GET /fixtures/{id}?include=lineups.details
```
- `lineups.details` pode ter estatísticas individuais por jogador

### Opção 3: Events
```
GET /fixtures/{id}?include=events
```
- Eventos como gols, cartões, substituições são por jogador
- Podemos agregar manualmente

## 🔧 Próxima Ação

Mudar a abordagem do player-stats:
1. Usar `events` para contar gols, cartões, assistências
2. Lineups para saber quem jogou
3. Calcular estatísticas a partir dos eventos
