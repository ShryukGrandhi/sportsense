// Chat service - Gemini AI integration with sports context
// Uses Gemini 2.5 Pro with Google Search grounding for real-time accuracy

import { GoogleGenerativeAI } from '@google/generative-ai';
import { crs } from '../sports';
import { VisualCard, GameWithStats, PlayerGameStats } from '../sports/types';
import { scraper } from '../search/scraper';
import { processGroundingMetadata, formatGroundingCitations, getSourcesArray } from '../ai/grounding-utils';

// Model configuration - Use Gemini 2.0 Flash (validated available model)
const GEMINI_MODEL = 'gemini-2.0-flash';
// Grounding disabled - API key may not have access
// const GROUNDING_CONFIG = {
//     tools: [{ googleSearch: {} }],
// };

// Lazy initialization of Gemini client
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBA5Ae622CZHDMc42Vnc60vUzZZDSxa0_4";
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    return new GoogleGenerativeAI(apiKey);
}

const SYSTEM_PROMPT = `You are Playmaker, an elite AI sports analyst with access to real-time data via Google Search.

CORE PRINCIPLES:
1. **ACCURACY FIRST** - Use Google Search to verify current scores, stats, and standings. Never guess.
2. **REAL-TIME AWARE** - Today's date matters. Search for the most current information.
3. **CITE YOUR SOURCES** - When using searched data, be transparent about where it came from.
4. **DEEP ANALYSIS** - Don't just recite stats, provide insight and context.
5. **ENGAGING DELIVERY** - Sound like an expert sports broadcaster, not a database.

When discussing games:
- ALWAYS verify live scores via search for ongoing games
- Lead with score and current game state
- Highlight key performers with specific stats
- Provide tactical observations

When discussing players:
- Search for their current season stats
- Compare to historical performance
- Note recent trends (hot/cold streaks)

When discussing standings/rankings:
- Search for current standings
- Note playoff implications
- Discuss recent momentum

Format responses with clean markdown. Be confident and authoritative.`;

interface ChatRequest {
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    gameId?: string;
    teamId?: string;
    league?: string;
}

interface ChatResponse {
    answerText: string;
    visualContext: VisualCard[];
    contextSummary?: string;
}

export async function processChatMessage(request: ChatRequest): Promise<ChatResponse> {
    const lastUserMessage = request.messages.filter(m => m.role === 'user').pop();

    if (!lastUserMessage) {
        return {
            answerText: 'Please ask me about a game, team, or player!',
            visualContext: [],
        };
    }

    // Get sports context based on the message
    const context = await crs.getContextForMessage(lastUserMessage.content);

    // Check if user is asking for news/headlines
    let newsContext = '';
    const isNewsQuery = /news|headline|rumor|latest|happening|update/i.test(lastUserMessage.content);

    if (isNewsQuery) {
        try {
            const newsItems = await scraper.searchNews(lastUserMessage.content);
            if (newsItems.length > 0) {
                newsContext = '\n\n### Latest News & Headlines (Source: ESPN)\n';
                newsItems.forEach(item => {
                    newsContext += `- ${item.headline}\n`;
                });
                context.contextSummary += ` + ${newsItems.length} news items`;
            }
        } catch (e) {
            console.error('News fetch error:', e);
        }
    }

    // Build the context for the LLM
    const contextMessage = buildContextMessage(context.game, context.games) + newsContext;

    // Build visual context for frontend
    const visualContext = crs.buildVisualContext(
        context.game,
        context.players,
        context.games
    );

    try {
        const ai = getGenAI();

        // Build the full prompt with context
        const prompt = `${SYSTEM_PROMPT}\n\n${contextMessage}\n\nUser question: ${lastUserMessage.content}`;

        // Use Gemini 2.0 Flash for AI response
        console.log('[Gemini] Using model:', GEMINI_MODEL);
        const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const response = result.response;

        // Process grounding metadata for sources (might be different structure in new SDK)
        // const grounding = processGroundingMetadata(response); 
        // For now disable grounding processing as it differs between SDKs

        const answerText = response.text() || 'Sorry, I couldn\'t generate a response.';

        console.log('[Gemini] Response generated');

        return {
            answerText,
            visualContext,
            contextSummary: context.contextSummary,
        };
    } catch (error: unknown) {
        // Log full error details
        console.error('Gemini API error:');
        console.error('Error type:', typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
            console.error('Stack:', error.stack);
        }

        // Return a fallback response with context
        return {
            answerText: generateFallbackResponse(context.game, lastUserMessage.content),
            visualContext,
            contextSummary: context.contextSummary,
        };
    }
}

function buildContextMessage(game?: GameWithStats, games?: GameWithStats[] | undefined): string {
    if (!game && (!games || games.length === 0)) {
        return 'No game data is currently available. Respond helpfully but note that live data is unavailable.';
    }

    let context = '## CURRENT SPORTS DATA CONTEXT\n\n';

    if (game) {
        context += `### Current Game\n`;
        context += `**${game.awayTeam.name}** @ **${game.homeTeam.name}**\n`;
        context += `Score: ${game.score.away} - ${game.score.home}\n`;
        context += `Status: ${formatGameStatus(game)}\n\n`;

        if (game.homePlayerStats && game.homePlayerStats.length > 0) {
            context += `### ${game.homeTeam.name} Key Players\n`;
            context += formatPlayerStats(game.homePlayerStats);
            context += '\n';
        }

        if (game.awayPlayerStats && game.awayPlayerStats.length > 0) {
            context += `### ${game.awayTeam.name} Key Players\n`;
            context += formatPlayerStats(game.awayPlayerStats);
            context += '\n';
        }
    }

    if (games && games.length > 0) {
        context += `### Today's Games (${games.length} total)\n`;
        games.slice(0, 5).forEach(g => {
            context += `- ${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation}: ${g.score.away}-${g.score.home} (${g.status})\n`;
        });
    }

    return context;
}

function formatGameStatus(game: GameWithStats): string {
    switch (game.status) {
        case 'in_progress':
            return game.clock ? `${game.clock.periodName} - ${game.clock.time}` : 'In Progress';
        case 'halftime':
            return 'Halftime';
        case 'final':
            return 'Final';
        case 'scheduled':
            return `Scheduled for ${new Date(game.startTime).toLocaleTimeString()}`;
        default:
            return game.status;
    }
}

function formatPlayerStats(players: PlayerGameStats[]): string {
    return players.slice(0, 3).map(p => {
        const stats = p.stats;
        const statLine: string[] = [];

        // NFL stats
        if (stats.passingYards !== undefined) {
            statLine.push(`${stats.completions}/${stats.attempts}, ${stats.passingYards} YDS, ${stats.passingTouchdowns} TD`);
        }
        if (stats.rushingYards !== undefined && stats.rushingAttempts && stats.rushingAttempts > 0) {
            statLine.push(`${stats.rushingAttempts} CAR, ${stats.rushingYards} YDS`);
        }
        if (stats.receivingYards !== undefined && stats.receptions && stats.receptions > 0) {
            statLine.push(`${stats.receptions} REC, ${stats.receivingYards} YDS`);
        }

        // NBA stats
        if (stats.points !== undefined) {
            statLine.push(`${stats.points} PTS, ${stats.rebounds} REB, ${stats.assists} AST`);
        }

        return `- **${p.name}** (${p.position}): ${statLine.join(' | ')}`;
    }).join('\n');
}

function generateFallbackResponse(game?: GameWithStats, userMessage?: string): string {
    if (!game) {
        return 'I\'m having trouble connecting to live data right now. Please try again in a moment!';
    }

    const { homeTeam, awayTeam, score, status } = game;

    if (status === 'in_progress') {
        const leading = score.home > score.away ? homeTeam.name : awayTeam.name;
        const leadScore = Math.max(score.home, score.away);
        const trailScore = Math.min(score.home, score.away);
        return `The **${leading}** are currently leading **${leadScore}-${trailScore}** in this matchup between the ${awayTeam.name} and ${homeTeam.name}.`;
    }

    if (status === 'final') {
        const winner = score.home > score.away ? homeTeam.name : awayTeam.name;
        return `Final score: **${awayTeam.abbreviation} ${score.away}** - **${homeTeam.abbreviation} ${score.home}**. The ${winner} won this one!`;
    }

    return `The ${awayTeam.name} play the ${homeTeam.name} at ${new Date(game.startTime).toLocaleTimeString()}.`;
}

export async function streamChatMessage(
    request: ChatRequest,
    onChunk: (text: string) => void
): Promise<ChatResponse> {
    const lastUserMessage = request.messages.filter(m => m.role === 'user').pop();

    if (!lastUserMessage) {
        return {
            answerText: 'Please ask me about a game, team, or player!',
            visualContext: [],
        };
    }

    const context = await crs.getContextForMessage(lastUserMessage.content);

    // Check for news intent (same logic as processChatMessage)
    let newsContext = '';
    const isNewsQuery = /news|headline|rumor|latest|happening|update/i.test(lastUserMessage.content);

    if (isNewsQuery) {
        try {
            const newsItems = await scraper.searchNews(lastUserMessage.content);
            if (newsItems.length > 0) {
                newsContext = '\n\n### Latest News & Headlines (Source: ESPN)\n';
                newsItems.forEach(item => {
                    newsContext += `- ${item.headline}\n`;
                });
                context.contextSummary += ` + ${newsItems.length} news items`;
            }
        } catch (e) {
            console.error('News fetch error:', e);
        }
    }

    const contextMessage = buildContextMessage(context.game, context.games) + newsContext;
    const visualContext = crs.buildVisualContext(context.game, context.players, context.games);

    try {
        const ai = getGenAI();

        const prompt = `${SYSTEM_PROMPT}\n\n${contextMessage}\n\nUser question: ${lastUserMessage.content}`;

        // Use Gemini 2.0 Flash for AI response
        console.log('[Gemini Stream] Using model:', GEMINI_MODEL);
        const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const response = result.response;
        // const grounding = processGroundingMetadata(response); // Disabled for now

        const fullText = response.text() || '';
        onChunk(fullText);

        console.log('[Gemini Stream] Response generated');

        return {
            answerText: fullText,
            visualContext,
            contextSummary: context.contextSummary,
        };
    } catch (error) {
        console.error('Gemini streaming error:', error);
        const fallback = generateFallbackResponse(context.game, lastUserMessage.content);
        onChunk(fallback);
        return {
            answerText: fallback,
            visualContext,
        };
    }
}
