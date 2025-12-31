import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processGroundingMetadata, getSourcesArray } from '@/lib/ai/grounding-utils';

// Model configuration - Use Gemini 2.0 Flash (validated available model)
const GEMINI_MODEL = 'gemini-2.0-flash';
// Grounding disabled - API key may not have access
// const GROUNDING_CONFIG = {
//     tools: [{ googleSearch: {} }],
// };

// In-memory chat storage
const chats: Map<string, { id: string; title: string; messages: any[]; created_at: string }> = new Map();

// Lazy initialization of Gemini client
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new GoogleGenerativeAI(apiKey);
}

// Fetch REAL ESPN scores
async function fetchESPNScores(sport: string): Promise<any> {
    try {
        const sportMap: Record<string, string> = {
            'nfl': 'football/nfl',
            'nba': 'basketball/nba',
            'mlb': 'baseball/mlb',
            'nhl': 'hockey/nhl',
            'ncaa': 'football/college-football'
        };

        const espnSport = sportMap[sport.toLowerCase()] || 'football/nfl';
        const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/scoreboard`;

        console.log(`[ESPN] Fetching scores from: ${url}`);

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            console.error(`[ESPN] Failed: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log(`[ESPN] Got ${data.events?.length || 0} games`);
        return data;
    } catch (error) {
        console.error('[ESPN] Fetch error:', error);
        return null;
    }
}

// Fetch REAL ESPN standings
async function fetchESPNStandings(sport: string): Promise<any> {
    try {
        const sportMap: Record<string, string> = {
            'nfl': 'football/nfl',
            'nba': 'basketball/nba',
            'mlb': 'baseball/mlb',
            'nhl': 'hockey/nhl'
        };

        const espnSport = sportMap[sport.toLowerCase()] || 'basketball/nba';
        const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/standings`;

        console.log(`[ESPN] Fetching standings from: ${url}`);

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            console.error(`[ESPN Standings] Failed: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log(`[ESPN] Got standings data`);
        return data;
    } catch (error) {
        console.error('[ESPN Standings] Fetch error:', error);
        return null;
    }
}

// Fetch live news from Google News RSS
async function fetchGoogleNews(query: string): Promise<any[]> {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/xml'
            }
        });

        if (!response.ok) return [];

        const xml = await response.text();
        const news: any[] = [];

        // Simple XML parsing for RSS items
        const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const item of itemMatches.slice(0, 5)) {
            const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') || '';
            const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
            const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'News';
            const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';

            if (title && link) {
                news.push({ title, link, source, pubDate });
            }
        }

        console.log(`[Google News] Found ${news.length} articles for "${query}"`);
        return news;
    } catch (error) {
        console.error('[Google News] Error:', error);
        return [];
    }
}

// Format ESPN data for AI context
function formatESPNData(espnData: any): { text: string; games: any[]; sources: string[] } {
    if (!espnData || !espnData.events) {
        return { text: '', games: [], sources: [] };
    }

    const sources = ['ESPN Scoreboard API'];
    const games: any[] = [];
    let text = '## LIVE ESPN SCORES (Real-Time):\n\n';

    for (const event of espnData.events.slice(0, 5)) {
        const competition = event.competitions?.[0];
        if (!competition) continue;

        const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');

        if (!homeTeam || !awayTeam) continue;

        const status = event.status?.type?.description || 'Scheduled';
        const homeScore = homeTeam.score || '0';
        const awayScore = awayTeam.score || '0';

        text += `${awayTeam.team?.displayName} ${awayScore} @ ${homeTeam.team?.displayName} ${homeScore} (${status})\n`;

        // Get top performers if available
        if (competition.leaders) {
            for (const leader of competition.leaders.slice(0, 2)) {
                const athlete = leader.leaders?.[0]?.athlete;
                const statValue = leader.leaders?.[0]?.displayValue;
                if (athlete && statValue) {
                    text += `  Top ${leader.displayName}: ${athlete.displayName} - ${statValue}\n`;
                }
            }
        }

        text += '\n';

        games.push({
            id: event.id,
            name: event.name,
            status,
            homeTeam: {
                name: homeTeam.team?.displayName,
                abbreviation: homeTeam.team?.abbreviation,
                logo: homeTeam.team?.logo,
                score: homeScore
            },
            awayTeam: {
                name: awayTeam.team?.displayName,
                abbreviation: awayTeam.team?.abbreviation,
                logo: awayTeam.team?.logo,
                score: awayScore
            },
            leaders: competition.leaders
        });
    }

    return { text, games, sources };
}

// Generate visual cards with REAL data
function generateVisualCards(games: any[], news: any[]) {
    const cards: any[] = [];

    // Separate live/finished games from scheduled games
    const liveGames: any[] = [];
    const scheduledGames: any[] = [];

    for (const game of games) {
        const status = (game.status || '').toLowerCase();
        const isLiveOrFinished = status.includes('final') || status.includes('live') ||
            status.includes('in progress') || status.includes('halftime') ||
            status.includes('1st') || status.includes('2nd') ||
            status.includes('3rd') || status.includes('4th') ||
            status.includes('quarter') || status.includes('half');

        if (isLiveOrFinished) {
            liveGames.push(game);
        } else {
            scheduledGames.push(game);
        }
    }

    // First, show live/finished games with real scores
    for (const game of liveGames.slice(0, 5)) {
        const homeScore = parseInt(game.homeTeam?.score) || 0;
        const awayScore = parseInt(game.awayTeam?.score) || 0;

        cards.push({
            type: 'scorecard',
            title: `${game.awayTeam?.abbreviation || 'AWAY'} @ ${game.homeTeam?.abbreviation || 'HOME'}`,
            teams: [
                {
                    name: game.homeTeam?.name,
                    abbreviation: game.homeTeam?.abbreviation,
                    logo: game.homeTeam?.logo,
                    score: homeScore,
                    isHome: true
                },
                {
                    name: game.awayTeam?.name,
                    abbreviation: game.awayTeam?.abbreviation,
                    logo: game.awayTeam?.logo,
                    score: awayScore,
                    isHome: false
                }
            ],
            meta: {
                status: game.status,
                sport: 'NFL',
                source: 'ESPN Live'
            }
        });

        // Add top performers for live/finished games
        if (game.leaders && game.leaders.length > 0) {
            const topPlayers = game.leaders.slice(0, 3).map((leader: any) => {
                const athlete = leader.leaders?.[0]?.athlete;
                const rawValue = parseFloat(leader.leaders?.[0]?.value) || 0;

                let impactScore = rawValue;
                const statType = (leader.displayName || '').toLowerCase();
                if (statType.includes('yard') || statType.includes('yds')) {
                    impactScore = Math.min(100, rawValue / 5);
                } else if (statType.includes('touchdown') || statType.includes('td')) {
                    impactScore = Math.min(100, rawValue * 25);
                } else if (statType.includes('rating') || statType.includes('pct')) {
                    impactScore = Math.min(100, rawValue);
                } else {
                    impactScore = Math.min(100, rawValue * 10);
                }

                return {
                    name: athlete?.displayName || 'Unknown',
                    position: leader.displayName,
                    team: athlete?.team?.abbreviation || '',
                    statistics: [
                        { displayName: leader.displayName, value: leader.leaders?.[0]?.displayValue || '' }
                    ],
                    impact_score: Math.round(impactScore * 10) / 10
                };
            });

            if (topPlayers.length > 0 && topPlayers.some((p: any) => p.name !== 'Unknown')) {
                cards.push({
                    type: 'top_player',
                    title: `Top Performers - ${game.name}`,
                    teams: [{
                        name: 'Game Leaders',
                        topPlayers
                    }]
                });
            }
        }
    }

    // If no live games, show upcoming schedule as a statistics card
    if (liveGames.length === 0 && scheduledGames.length > 0) {
        const upcomingRows = scheduledGames.slice(0, 8).map((game: any) => [
            `${game.awayTeam?.abbreviation || '?'} @ ${game.homeTeam?.abbreviation || '?'}`,
            game.awayTeam?.name || 'TBD',
            game.homeTeam?.name || 'TBD',
            game.status || 'Scheduled'
        ]);

        cards.push({
            type: 'statistics',
            title: 'Upcoming NFL Games',
            headers: ['Matchup', 'Away Team', 'Home Team', 'Status'],
            rows: upcomingRows,
            collapsible: true
        });
    }

    // Add news cards if available
    if (news && news.length > 0) {
        cards.push({
            type: 'statistics',
            title: 'Latest Sports News',
            headers: ['Headline', 'Source'],
            rows: news.slice(0, 5).map((article: any) => [
                article.title?.slice(0, 80) + (article.title?.length > 80 ? '...' : ''),
                article.source || 'News'
            ]),
            collapsible: true
        });
    }

    return cards;
}

// Build sources list for citation
function buildSourcesCitation(sources: string[], news: any[]): string {
    let citation = '\n\n---\n**Sources:**\n';

    for (const source of sources) {
        citation += `• ${source}\n`;
    }

    for (const article of news.slice(0, 3)) {
        citation += `• [${article.source}](${article.link}): ${article.title.slice(0, 60)}...\n`;
    }

    return citation;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params;
        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: 'Message content required' }, { status: 400 });
        }

        // Get or create chat
        let chat = chats.get(chatId);
        if (!chat) {
            chat = {
                id: chatId,
                title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
                messages: [],
                created_at: new Date().toISOString()
            };
            chats.set(chatId, chat);
        }

        // Add user message
        const userMessage = {
            id: uuidv4(),
            role: 'user',
            content,
            created_at: new Date().toISOString()
        };
        chat.messages.push(userMessage);

        const lowerQuery = content.toLowerCase();

        // Determine sport from query - check for player names and sport keywords
        let sport = 'nfl'; // Default

        // NBA players and keywords
        const nbaTerms = ['nba', 'basketball', 'lebron', 'luka', 'curry', 'durant', 'giannis', 'jokic', 'tatum', 'embiid', 'doncic', 'lakers', 'celtics', 'warriors', 'heat', 'bucks', 'nuggets', 'suns', 'mavericks', 'knicks', 'sixers'];
        // NFL players and keywords  
        const nflTerms = ['nfl', 'football', 'mahomes', 'kelce', 'travis', 'lamar', 'burrow', 'allen', 'chiefs', 'eagles', 'cowboys', 'ravens', 'bills', 'chiefs', '49ers', 'niners', 'puka', 'nacua', 'smith-njigba', 'jsn'];
        // MLB keywords
        const mlbTerms = ['mlb', 'baseball', 'ohtani', 'trout', 'judge', 'soto', 'yankees', 'dodgers', 'braves', 'astros', 'phillies'];
        // NHL keywords
        const nhlTerms = ['nhl', 'hockey', 'mcdavid', 'crosby', 'ovechkin', 'oilers', 'penguins', 'bruins', 'maple leafs'];

        if (nbaTerms.some(term => lowerQuery.includes(term))) {
            sport = 'nba';
        } else if (nflTerms.some(term => lowerQuery.includes(term))) {
            sport = 'nfl';
        } else if (mlbTerms.some(term => lowerQuery.includes(term))) {
            sport = 'mlb';
        } else if (nhlTerms.some(term => lowerQuery.includes(term))) {
            sport = 'nhl';
        } else if (lowerQuery.includes('college') || lowerQuery.includes('ncaa')) {
            sport = 'ncaa';
        }

        // Detect if user is asking about standings
        const isStandingsQuery = lowerQuery.includes('standing') || lowerQuery.includes('ranking') ||
            lowerQuery.includes('leaderboard') || lowerQuery.includes('top team') ||
            lowerQuery.includes('conference') || lowerQuery.includes('division');

        // Fetch REAL data from ESPN and sport-specific Google News
        console.log(`[CHAT] Detected sport: ${sport}, standings query: ${isStandingsQuery}, for query: "${content.slice(0, 50)}..."`);

        const [espnData, newsData, standingsData] = await Promise.all([
            fetchESPNScores(sport),
            fetchGoogleNews(`${content} ${sport}`),
            isStandingsQuery ? fetchESPNStandings(sport) : Promise.resolve(null)
        ]);

        // Format real ESPN data
        const { text: espnContext, games, sources } = formatESPNData(espnData);

        // Pre-build standings cards directly from ESPN API (complete data, not for Gemini)
        let standingsCards: any[] = [];
        let standingsContext = '';

        if (standingsData && standingsData.children) {
            standingsContext = '\n## REAL ESPN STANDINGS:\n';

            for (const conference of standingsData.children || []) {
                const confName = conference.name || 'Conference';
                const entries = conference.standings?.entries || [];

                // Create a complete standings card with ALL teams and rich data
                const rows = entries.map((entry: any, idx: number) => {
                    const team = entry.team?.displayName || 'Unknown';
                    const teamLogo = entry.team?.logos?.[0]?.href || null;
                    const stats = entry.stats || [];

                    // Extract all available stats
                    const wins = stats.find((s: any) => s.name === 'wins')?.value || 0;
                    const losses = stats.find((s: any) => s.name === 'losses')?.value || 0;
                    const pct = stats.find((s: any) => s.name === 'winPercent')?.value || 0;
                    const gb = stats.find((s: any) => s.name === 'gamesBehind')?.displayValue || '-';
                    const streak = stats.find((s: any) => s.name === 'streak')?.displayValue || '-';
                    const home = stats.find((s: any) => s.name === 'Home')?.displayValue ||
                        stats.find((s: any) => s.name === 'home')?.displayValue || '-';
                    const away = stats.find((s: any) => s.name === 'Road')?.displayValue ||
                        stats.find((s: any) => s.name === 'away')?.displayValue || '-';
                    const l10 = stats.find((s: any) => s.name === 'Last Ten Games')?.displayValue ||
                        stats.find((s: any) => s.name === 'L10')?.displayValue || '-';
                    const confRecord = stats.find((s: any) => s.name === 'vs. Conf.')?.displayValue ||
                        stats.find((s: any) => s.name === 'vsConf')?.displayValue || '-';
                    const ppg = stats.find((s: any) => s.name === 'pointsFor')?.displayValue ||
                        stats.find((s: any) => s.name === 'avgPointsFor')?.displayValue || '-';
                    const oppPpg = stats.find((s: any) => s.name === 'pointsAgainst')?.displayValue ||
                        stats.find((s: any) => s.name === 'avgPointsAgainst')?.displayValue || '-';
                    const diff = stats.find((s: any) => s.name === 'differential')?.displayValue ||
                        stats.find((s: any) => s.name === 'pointDifferential')?.displayValue || '-';

                    // Also add to text context for Gemini awareness
                    standingsContext += `${idx + 1}. ${team}: ${wins}-${losses} (.${Math.round(pct * 1000)}) STRK:${streak}\n`;

                    return {
                        rank: idx + 1,
                        team: team,
                        logo: teamLogo,
                        wins: wins,
                        losses: losses,
                        pct: `.${Math.round(pct * 1000)}`,
                        gb: gb,
                        streak: streak,
                        home: home,
                        away: away,
                        l10: l10,
                        conf: confRecord,
                        ppg: ppg,
                        oppPpg: oppPpg,
                        diff: diff
                    };
                });

                // Create enhanced standings card with logo support
                standingsCards.push({
                    type: 'standings',  // New type for richer display
                    title: `${confName} Standings`,
                    sport: sport.toUpperCase(),
                    headers: ['#', 'Team', 'W', 'L', 'PCT', 'GB', 'STRK', 'HOME', 'AWAY', 'L10', 'DIFF'],
                    data: rows,
                    collapsible: true,
                    verified: true,
                    source: 'ESPN'
                });

                standingsContext += '\n';
            }
            sources.push('ESPN Standings API');
        }

        // Format news context
        let newsContext = '';
        if (newsData.length > 0) {
            newsContext = '\n## LATEST NEWS (Google News - Real-Time):\n\n';
            for (const article of newsData.slice(0, 5)) {
                newsContext += `• ${article.title} (${article.source})\n`;
            }
            sources.push('Google News RSS');
        }

        // Generate AI response with REAL data - TWO PARTS: Text + Visuals
        let aiContent = '';
        let structuredContent: any[] = [];

        try {
            const ai = getGenAI();

            if (ai) {
                // PART 1: Generate conversational text answer with Google Search grounding
                const textPrompt = `You are Playmaker, an elite AI sports analyst with real-time access to data via Google Search.

TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
DETECTED SPORT: ${sport.toUpperCase()}

AVAILABLE REAL-TIME DATA:
${espnContext || 'No live game data available.'}
${newsContext || ''}
${standingsContext || ''}

USER QUESTION: "${content}"

INSTRUCTIONS:
1. USE GOOGLE SEARCH to find current, accurate information to answer this question
2. Provide a direct, intelligent answer - not "I found X results" but the actual answer
3. Be conversational but authoritative - like an expert sports broadcaster
4. Include specific stats, scores, and facts with dates
5. If you searched for info, weave it naturally into your response
6. For predictions/opinions, be bold and back them up with data

RESPONSE FORMAT:
- Start with the direct answer to their question
- Support with specific data and stats
- Keep it concise but comprehensive (2-4 paragraphs max)
- Use markdown for emphasis when helpful`;

                // PART 2: Generate visual cards prompt
                const cardsPrompt = `You are a sports data visualization AI. Generate JSON cards for this query.

SPORT: ${sport.toUpperCase()}
QUERY: "${content}"
TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${espnContext ? `LIVE ESPN DATA:\n${espnContext}` : ''}
${standingsContext ? `STANDINGS DATA:\n${standingsContext}` : ''}
${newsContext ? `NEWS:\n${newsContext}` : ''}

Generate 1-3 visual cards as JSON. Output ONLY valid JSON, no markdown.

CARD TYPES:
1. Scorecard: {"type":"scorecard","title":"PHI @ MEM","teams":[{"name":"76ers","score":101},{"name":"Grizzlies","score":99}],"status":"Final"}
2. Player: {"type":"player","title":"Player Profile","player_name":"LeBron James","team":"Lakers","stats":{"PPG":"25.4","RPG":"7.8"}}
3. Comparison: {"type":"comparison","title":"LeBron vs Luka","players":[{"name":"LeBron","stats":{"PPG":"25.4"}},{"name":"Luka","stats":{"PPG":"33.2"}}]}
4. Statistics: {"type":"statistics","title":"NBA Standings","headers":["Team","W","L"],"rows":[["Thunder","27","5"]]}
5. News: {"type":"statistics","title":"Latest News","headers":["Headline","Source"],"rows":[["Trade rumors heating up","ESPN"]]}

RULES:
- Use REAL data from context when available
- Search for current stats if needed
- Output format: {"cards":[...]}`;

                console.log('[GEMINI] Generating combined text + cards response...');

                // Grounding configuration for real-time data
                const GROUNDING_CONFIG = {
                    tools: [{ googleSearch: {} }],
                };

                // ... (in getGenAI or route handler)

                // Single combined call with standard SDK
                const model = ai.getGenerativeModel({
                    model: GEMINI_MODEL,
                    tools: [{ googleSearch: {} } as any]
                });

                let result;
                const prompt = `You are Playmaker, an elite AI sports analyst.
Gemini 2.0 Flash Active.
Grounding: ENABLED (Use Google Search for real-time player stats).

TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
SPORT: ${sport.toUpperCase()}

CONTEXT DATA (Trusted Sources):
${espnContext || 'No live game data.'}
${newsContext || ''}
${standingsContext || ''}

USER QUESTION: "${content}"

CRITICAL INSTRUCTION:
You MUST generate a visual card in EVERY response.
If the user asks for a comparison, you MUST generate a {"type": "stat-comparison"} card.
USE GOOGLE SEARCH to fill the card with EXACT REAL-TIME 2024/2025 STATS.
DO NOT use "Estimated" or "Projected" unless strictly necessary. Cite "Real-Time Data" as source.


Respond with TWO parts separated by "---CARDS---":

PART 1 (Before ---CARDS---):
Write EXACTLY ONE sentence of introductory analysis.
- KEEP IT BRIEF. No long text blobs.
- Example: "Here is the comparison between Puka Nacua and Jaxon Smith-Njigba based on real-time data."

PART 2 (After ---CARDS---):
Output ONLY valid JSON: {"cards":[...]}

Card types (Strict JSON structure):
1. Scorecard: {"type":"scorecard","title":"Recent Match","teams":[{"name":"76ers","score":101},{"name":"Grizzlies","score":99}],"meta":{"status":"Final","sport":"NFL"}}
2. Player: {"type":"player","title":"Player Profile","player_name":"LeBron James","team":"Lakers","stats":{"PPG":"25.4","RPG":"7.8"}}
3. Comparison: {"type":"stat-comparison","data":{"players":[{"name":"LeBron","stats":{"PPG":"25.4"}},{"name":"Luka","stats":{"PPG":"33.2"}}],"statKeys":["PPG","RPG","APG"]}}
4. Statistics: {"type":"statistics","title":"Standings","headers":["Team","W","L"],"rows":[["Thunder","27","5"]]}
5. News: {"type":"statistics","title":"Related News","headers":["Headline","Source"],"rows":[["Trade rumors heating up","ESPN"]]}

CRITICAL:
- ALL DATA must be in CARDS.
- Text part must be ONE SENTENCE.
- DO NOT duplicate data in text.
- GENERATE DENSE DATA: For comparisons, include **8-12 rows of stats**, including Advanced Metrics (e.g. PER, EPA/Play, YAC, TS%).
- KEY INSIGHT: You MUST include a "key_insight" field in the \`stat-comparison\` card with a deep, expert-level analysis (2-3 sentences).
- IMAGES: Use Google Search to find a REAL, high-quality image URL (ending in .jpg/.png) for the players. Put it in the "image" field. Avoid generic placeholders.

JSON Examples:
- {"type":"scorecard", "data": {"game": {...}, "showDetails": true}}
- {"type":"player", "data": {"player": {"name":"LeBron", "teamAbbreviation":"LAL", "stats":{...}, "image": "https://example.com/lebron-action.jpg"}}}
- {"type":"stat-comparison", "key_insight": "Puka Nacua's YAC efficiency is in the 98th percentile, significantly outperforming JSN...", "data": {"players": [{"name":"Puka", "image":"https://real-url.com/puka.jpg", "stats":{"Receptions":"105 (Rank #4)", "Yards":"1486", "YAC/Rec":"6.2", "Drops":"2"}}, {"name":"Jaxon", "image":"https://real-url.com/jsn.jpg", "stats":{...}}], "statKeys": ["Receptions", "Yards", "YAC/Rec", "Drops", "Target Share", "Contested Catch Rate"]}}


Example Response:
### 📊 Comparison
* **Puka Nacua** leads in yards...

---CARDS---
{"cards":[{"type":"stat-comparison","data":{"players":[...], "statKeys": ["points"]}}]}`;

                try {
                    result = await model.generateContent(prompt);
                } catch (toolError) {
                    console.warn('[GEMINI] Tool error, falling back to standard model:', toolError);
                    const fallbackModel = ai.getGenerativeModel({ model: GEMINI_MODEL });
                    const fallbackPrompt = prompt + "\n\n(Note: Search tools unavailable. Use internal knowledge or context data.)";
                    result = await fallbackModel.generateContent(fallbackPrompt);
                }

                if (!result || !result.response) {
                    throw new Error('Failed to generate content from AI model');
                }

                const fullResponse = result.response.text();
                console.log('[GEMINI] Response length:', fullResponse.length);
                console.log('[GEMINI] Response preview:', fullResponse.slice(0, 400));

                // Split into text and cards
                if (fullResponse.includes('---CARDS---')) {
                    const parts = fullResponse.split('---CARDS---');
                    aiContent = parts[0].trim();

                    // Parse cards
                    try {
                        let cardsJson = parts[1].trim();
                        const codeMatch = cardsJson.match(/```(?:json)?\s*([\s\S]*?)```/);
                        if (codeMatch) cardsJson = codeMatch[1].trim();

                        const objMatch = cardsJson.match(/\{[\s\S]*\}/);
                        if (objMatch) cardsJson = objMatch[0];

                        const parsed = JSON.parse(cardsJson);
                        if (parsed.cards) {
                            structuredContent = parsed.cards.map((c: any) => {
                                // Fix flat structure (common LLM mistake)
                                if ((c.type === 'stat-comparison' || c.type === 'comparison') && c.players && !c.data) {
                                    return {
                                        type: 'stat-comparison',
                                        id: c.id || Math.random().toString(36).substring(7),
                                        data: { players: c.players, statKeys: c.statKeys }
                                    };
                                }
                                // Ensure standard structure
                                if (!c.id) c.id = Math.random().toString(36).substring(7);
                                return c;
                            });
                        }
                    } catch (e) {
                        console.error('[GEMINI] Cards parse error:', e);
                        structuredContent = generateVisualCards(games, newsData);
                    }
                } else {
                    aiContent = fullResponse;
                    structuredContent = generateVisualCards(games, newsData);
                }

                console.log('[GEMINI] Final text length:', aiContent.length);
                console.log('[GEMINI] Cards count:', structuredContent.length);

                if (sources.length > 0) {
                    aiContent += buildSourcesCitation(sources, newsData);
                }

            } else {
                aiContent = 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment.';
                structuredContent = generateVisualCards(games, newsData);
            }
        } catch (aiError: any) {
            console.error('[GEMINI] API Error:', aiError?.message);
            aiContent = `Gemini API Error: ${aiError?.message}. Using model: ${GEMINI_MODEL}.`;
            structuredContent = generateVisualCards(games, newsData);
        }

        // For standings queries, ALWAYS use the pre-built complete standings cards
        // These have all teams, logos, and rich data directly from ESPN
        if (isStandingsQuery && standingsCards.length > 0) {
            // Use pre-built standings cards which have ALL teams and rich data
            structuredContent = standingsCards;
            const totalTeams = standingsCards.reduce((acc, c) => acc + (c.data?.length || 0), 0);
            console.log('[STANDINGS] Using pre-built standings cards with', totalTeams, 'total teams');
        } else if (structuredContent.length === 0) {
            // If no structured content was generated, fall back to ESPN cards
            structuredContent = generateVisualCards(games, newsData);
        }

        // Create assistant message
        const assistantMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: aiContent,
            structured_content: structuredContent,
            sources: sources,
            data_info: {
                espn_games: games.length,
                news_articles: newsData.length,
                fetched_at: new Date().toISOString()
            },
            created_at: new Date().toISOString()
        };
        chat.messages.push(assistantMessage);

        return NextResponse.json(assistantMessage);

    } catch (error) {
        console.error('[CHAT] Error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
