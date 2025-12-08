// Test file with hardcoded Premier League data
// This allows testing the league details endpoint structure

const hardcodedLeagueData = {
    leagueInfo: {
        name: "Premier League",
        country: "England",
        season: "2024/2025",
        logo: "https://cdn.sportmonks.com/images/soccer/leagues/8/8.png",
        country_flag: "https://cdn.sportmonks.com/images/countries/462.png"
    },

    currentRound: {
        round_id: 15,
        name: "Jornada 15",
        fixtures: [
            {
                id: 19427596,
                home_team: {
                    name: "Arsenal",
                    logo: "https://cdn.sportmonks.com/images/soccer/teams/18/50.png"
                },
                away_team: {
                    name: "Manchester United",
                    logo: "https://cdn.sportmonks.com/images/soccer/teams/19/51.png"
                },
                score: "2-1",
                status: "FT",
                starting_at: "2025-12-07 15:00:00"
            },
            {
                id: 19427597,
                home_team: {
                    name: "Liverpool",
                    logo: "https://cdn.sportmonks.com/images/soccer/teams/14/46.png"
                },
                away_team: {
                    name: "Chelsea",
                    logo: "https://cdn.sportmonks.com/images/soccer/teams/17/49.png"
                },
                score: "3-3",
                status: "FT",
                starting_at: "2025-12-07 17:30:00"
            },
            {
                id: 19427598,
                home_team: {
                    name: "Manchester City",
                    logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png"
                },
                away_team: {
                    name: "Tottenham",
                    logo: "https://cdn.sportmonks.com/images/soccer/teams/21/53.png"
                },
                score: "0-0",
                status: "NS",
                starting_at: "2025-12-08 16:00:00"
            }
        ]
    },

    standings: [
        {
            position: 1,
            team_name: "Arsenal",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/18/50.png",
            points: 33,
            stats: {
                p: 15,
                w: 10,
                d: 3,
                l: 2,
                goals: "28:9"
            },
            form: "V-V-E-V-E",
            status: "Champions League"
        },
        {
            position: 2,
            team_name: "Liverpool",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/14/46.png",
            points: 32,
            stats: {
                p: 15,
                w: 10,
                d: 2,
                l: 3,
                goals: "30:12"
            },
            form: "V-E-V-V-E",
            status: "Champions League"
        },
        {
            position: 3,
            team_name: "Manchester City",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png",
            points: 31,
            stats: {
                p: 15,
                w: 9,
                d: 4,
                l: 2,
                goals: "35:11"
            },
            form: "V-V-E-V-D",
            status: "Champions League"
        },
        {
            position: 4,
            team_name: "Aston Villa",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/7/39.png",
            points: 28,
            stats: {
                p: 15,
                w: 8,
                d: 4,
                l: 3,
                goals: "24:15"
            },
            form: "V-E-V-D-V",
            status: "Champions League"
        },
        {
            position: 5,
            team_name: "Tottenham",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/21/53.png",
            points: 26,
            stats: {
                p: 15,
                w: 8,
                d: 2,
                l: 5,
                goals: "26:18"
            },
            form: "V-D-V-V-D",
            status: "Europa League"
        },
        {
            position: 18,
            team_name: "Luton Town",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/1/33.png",
            points: 12,
            stats: {
                p: 15,
                w: 3,
                d: 3,
                l: 9,
                goals: "12:28"
            },
            form: "D-D-D-E-D",
            status: "Relegation"
        },
        {
            position: 19,
            team_name: "Burnley",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/2/34.png",
            points: 10,
            stats: {
                p: 15,
                w: 2,
                d: 4,
                l: 9,
                goals: "10:30"
            },
            form: "D-E-D-D-D",
            status: "Relegation"
        },
        {
            position: 20,
            team_name: "Sheffield United",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/3/35.png",
            points: 8,
            stats: {
                p: 15,
                w: 2,
                d: 2,
                l: 11,
                goals: "9:32"
            },
            form: "D-D-D-E-D",
            status: "Relegation"
        }
    ],

    leagueInsights: {
        bestAttack: {
            team: "Manchester City",
            value: 35
        },
        bestDefense: {
            team: "Arsenal",
            value: 9
        },
        mostWins: {
            team: "Arsenal",
            value: 10
        },
        mostLosses: {
            team: "Sheffield United",
            value: 11
        }
    },

    topPlayers: {
        scorers: [
            {
                player_name: "Erling Haaland",
                team_name: "Manchester City",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png",
                goals: 18
            },
            {
                player_name: "Mohamed Salah",
                team_name: "Liverpool",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/14/46.png",
                goals: 14
            },
            {
                player_name: "Bukayo Saka",
                team_name: "Arsenal",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/18/50.png",
                goals: 12
            },
            {
                player_name: "Son Heung-min",
                team_name: "Tottenham",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/21/53.png",
                goals: 11
            },
            {
                player_name: "Ollie Watkins",
                team_name: "Aston Villa",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/7/39.png",
                goals: 10
            }
        ],
        assists: [
            {
                player_name: "Kevin De Bruyne",
                team_name: "Manchester City",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png",
                assists: 10
            },
            {
                player_name: "Bruno Fernandes",
                team_name: "Manchester United",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/19/51.png",
                assists: 8
            },
            {
                player_name: "Mohamed Salah",
                team_name: "Liverpool",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/14/46.png",
                assists: 7
            },
            {
                player_name: "Bukayo Saka",
                team_name: "Arsenal",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/18/50.png",
                assists: 7
            },
            {
                player_name: "James Maddison",
                team_name: "Tottenham",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/21/53.png",
                assists: 6
            }
        ],
        ratings: [
            {
                player_name: "Erling Haaland",
                team_name: "Manchester City",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png",
                rating: "8.45"
            },
            {
                player_name: "Mohamed Salah",
                team_name: "Liverpool",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/14/46.png",
                rating: "8.32"
            },
            {
                player_name: "Bukayo Saka",
                team_name: "Arsenal",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/18/50.png",
                rating: "8.18"
            },
            {
                player_name: "Kevin De Bruyne",
                team_name: "Manchester City",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png",
                rating: "8.05"
            },
            {
                player_name: "Rodri",
                team_name: "Manchester City",
                team_logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png",
                rating: "7.98"
            }
        ]
    },

    teamStatsTable: [
        {
            team: "Arsenal",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/18/50.png",
            over05HT: 73,
            over25FT: 67,
            btts: 40,
            avgGoals: "2.5",
            avgCorners: "N/A"
        },
        {
            team: "Liverpool",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/14/46.png",
            over05HT: 80,
            over25FT: 73,
            btts: 53,
            avgGoals: "2.8",
            avgCorners: "N/A"
        },
        {
            team: "Manchester City",
            team_logo: "https://cdn.sportmonks.com/images/soccer/teams/16/48.png",
            over05HT: 87,
            over25FT: 80,
            btts: 47,
            avgGoals: "3.1",
            avgCorners: "N/A"
        }
    ]
};

// Display the hardcoded data
console.log('\n📊 Hardcoded Premier League Data\n');
console.log('='.repeat(60));
console.log(JSON.stringify(hardcodedLeagueData, null, 2));
console.log('\n='.repeat(60));
console.log('✅ Hardcoded data structure ready for testing\n');

// Export for use in tests
export default hardcodedLeagueData;
