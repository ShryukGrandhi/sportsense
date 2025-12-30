import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';

// In-memory chat storage
const chats: Map<string, { id: string; title: string; messages: any[]; created_at: string }> = new Map();

// Lazy initialization of Gemini client
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new GoogleGenAI({ apiKey });
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

        // Generate AI response with REAL data
        let aiContent = '';
        let structuredContent: any[] = [];

        try {
            const ai = getGenAI();

            if (ai) {
                // Use Gemini to generate query-relevant structured content
                const structuredPrompt = `You are Playmaker, a sports AI. Output ONLY valid JSON with no markdown, no code blocks, just raw JSON.

DETECTED SPORT: ${sport.toUpperCase()}
TODAY: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${standingsContext ? `REAL ESPN STANDINGS DATA:\n${standingsContext}` : ''}

USER QUERY: "${content}"

Generate a JSON response with cards relevant to the query. Here are the card types:

FOR STANDINGS QUERIES (use the REAL ESPN data above if available):
{"cards":[{"type":"statistics","title":"Eastern Conference Standings","headers":["Team","W","L","PCT"],"rows":[["Detroit Pistons","24","6",".800"],["New York Knicks","20","9",".690"]]}]}

FOR PLAYER COMPARISONS (e.g., "Luka vs LeBron", "compare player X and Y"):
{"cards":[{"type":"comparison","title":"LeBron James vs Luka Doncic","players":[{"name":"LeBron James","team":"Lakers","position":"SF","stats":{"PPG":"25.4","RPG":"7.8","APG":"8.2"}},{"name":"Luka Doncic","team":"Mavericks","position":"PG","stats":{"PPG":"33.2","RPG":"9.4","APG":"9.8"}}],"comparison_metrics":[{"name":"Points Per Game","values":["25.4","33.2"]},{"name":"Rebounds","values":["7.8","9.4"]},{"name":"Assists","values":["8.2","9.8"]}]}]}

FOR PLAYER STATS (e.g., "show me LeBron stats"):
{"cards":[{"type":"player","title":"Player Profile","player_name":"LeBron James","team":"Los Angeles Lakers","position":"Small Forward","stats":{"PPG":"25.4","RPG":"7.8","APG":"8.2","Career Points":"40000+"}}]}

FOR GAME/SCHEDULE QUERIES:
{"cards":[{"type":"statistics","title":"Upcoming ${sport.toUpperCase()} Games","headers":["Matchup","Status"],"rows":[["Team A @ Team B","Scheduled"]]}]}

FOR NEWS QUERIES:
{"cards":[{"type":"statistics","title":"Latest ${sport.toUpperCase()} News","headers":["Headline","Source"],"rows":[["News headline...","ESPN"]]}]}

CRITICAL RULES:
- Output ONLY the JSON object, no other text
- FOR STANDINGS: If REAL ESPN data is provided above, use EXACTLY those numbers. Do NOT use your training data.
- FOR PLAYER STATS: Use approximate 2024-25 season stats (mark as estimates if unsure)
- For comparisons, always include both players with their stats
- Generate exactly 1-3 cards that answer the query`;

                console.log('[GEMINI] Generating query-relevant structured content');

                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: structuredPrompt,
                });

                const responseText = response.text || '';
                console.log('[GEMINI] Raw response:', responseText.slice(0, 500));

                // Parse the JSON response
                try {
                    // Extract JSON from the response (handle markdown code blocks)
                    let jsonStr = responseText;
                    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (jsonMatch) {
                        jsonStr = jsonMatch[1].trim();
                    }

                    const parsed = JSON.parse(jsonStr);
                    if (parsed.cards && Array.isArray(parsed.cards)) {
                        structuredContent = parsed.cards;
                        console.log('[GEMINI] Parsed', structuredContent.length, 'cards');
                    }
                } catch (parseErr) {
                    console.error('[GEMINI] JSON parse error:', parseErr);
                    // Fallback to ESPN data if JSON parsing fails
                    structuredContent = generateVisualCards(games, newsData);
                }

                // Generate a brief AI summary (hidden from UI but available)
                aiContent = `Query processed. Generated ${structuredContent.length} visual cards.`;
                aiContent += buildSourcesCitation(sources, newsData);

            } else {
                // Fallback if no Gemini API
                aiContent = 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment.';
                structuredContent = generateVisualCards(games, newsData);
            }
        } catch (aiError) {
            console.error('[GEMINI] Error:', aiError);
            aiContent = `Error generating response. Showing ESPN data.`;
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
