# Project Status: Match Statistics Integration

**Last Updated:** 2025-12-07
**Objective:** Integrate detailed match statistics from Sportmonks API v3 into the `aline-api` backend to power "Goals" and "Corners" tabs.

## 1. Overview
The backend now successfully fetches and calculates a wide range of match statistics, including Goal Markets (Odds), Team Form, and Corner Averages. The system uses a multi-fetch strategy to bypass API plan limitations and aggregates data from multiple endpoints.

## 2. Current Status
| Feature | Status | Details |
| :--- | :--- | :--- |
| **Basic Info** | ✅ Complete | Teams, League, Venue, Round. |
| **Goal Markets** | ✅ Complete | Odds for Over 0.5, 1.5, 2.5, 3.5 Goals. |
| **Team Form** | ✅ Complete | Last 5 matches (W-D-L) calculated from history. |
| **Shot Stats** | ✅ Complete | Total, On Target, Off Target, Blocked. |
| **Corner Stats** | ⚠️ Partial | Averages (For/Against) & Trends working. **Races/Intervals unavailable** due to missing historical corner events in API. |
| **Goal Analysis** | ✅ Complete | BTTS, First to Score, Over/Under calculated from detailed history (Heavy Fetch). |
| **Card Stats** | ✅ Complete | Averages, Markets, Halves, Intervals (15min). |
| **General Stats** | ✅ Complete | Shots (Total, On/Off, Box), Control (Possession, Fouls, etc). |
| **Charts** | ✅ Complete | Timeline (0-90') for Shots & Pressure. Attacks data limited by API. |
| **Live Support** | ✅ Complete | Dynamic Cache (60s TTL for Live), Dynamic Timeline (grows with game). |
| **Team Page** | ✅ Complete | Stats Grid, Radar, Match History (with Badges). Squad data limited. |
| **Referee** | ✅ Complete | Referee Name fetched. Stats fallback to 0 if unavailable. |
| **Other Stats** | ✅ Complete | Fouls, Offsides, Possession, etc. |
| **xG / Weather** | ❌ Unavailable | Not returned by API for current plan/fixtures. |

## 3. Technical Implementation

### Key Files
- **`src/features/match/match.service.js`**: 
  - Orchestrates data fetching.
  - Executes **5 parallel API calls** to fetch `participants`, `statistics`, `league`, `venue`, and `odds`.
  - Fetches detailed team history (`latest.events.type;latest.statistics.type`) for form and corner analysis.
- **`src/features/match/corners.service.js`**:
  - Specialized service for calculating corner metrics.
  - Processes last 10 home/away matches to compute averages and trends.
- **`test-api.js`**:
  - Root-level script to verify the integration.
  - Fetches data for a test fixture (`19568462`) and logs the calculated stats.

### API Integration Details
- **Base URL**: `https://api.sportmonks.com/v3/football`
- **Authentication**: Uses `SPORTMONKS_API_TOKEN` from `.env`.
- **Include Syntax**: 
  - For simple includes: `include=participants`
  - For nested includes on same relation: `include=latest.events.type;latest.statistics.type` (Semicolon separator required).

## 4. Known Limitations
- **Historical Corner Events**: The `latest.events` (and detailed fetch) returns major events (Goals, Cards, Subs) but **omits Corner events** for historical matches in the current API plan/configuration.
  - **Impact**: We cannot calculate "Race to X Corners" or "Corners per 10min Interval" for past games.
  - **Workaround**: We use `statistics` (Total Corners) to calculate Averages and "Over 8.5" trends, which remains accurate. Goal Analysis (BTTS, First to Score) is fully functional.

## 5. How to Verify
To verify the current state of the integration, run the test script in the root directory:

```bash
node test-api.js
```

This will output:
1.  Connection status.
2.  Fetched data summary (Match name, History count).
3.  Calculated Stats JSON (Form, Markets, Shot Stats).
4.  Corner Analysis (Averages, Trends).

## 6. Next Steps (If Resuming)
1.  **Frontend Integration**: Connect these backend services to the frontend components.
2.  **Database Sync**: Ensure `getMatchStats` correctly saves/updates the fetched data to the database.
3.  **Error Handling**: Refine error handling for API rate limits or timeouts.
