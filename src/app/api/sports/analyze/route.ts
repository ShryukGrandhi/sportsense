import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processGroundingMetadata, getSourcesArray, formatGroundingCitations } from '@/lib/ai/grounding-utils';

// Model configuration - Use Gemini 2.0 Flash (validated available model)
const GEMINI_MODEL = 'gemini-2.0-flash';
// Grounding disabled - API key may not have access
// const GROUNDING_CONFIG = {
//     tools: [{ googleSearch: {} }],
// };

// Lazy initialization of Gemini client
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new GoogleGenerativeAI(apiKey);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, sport, include_context = true } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query required' }, { status: 400 });
        }

        let response_text = '';
        let structured_content: any[] = [];
        let sources: string[] = [];

        // Generate AI analysis with Gemini 2.5 Pro + Google Search grounding
        const ai = getGenAI();

        if (ai) {
            const prompt = `You are Playmaker, an elite sports analyst with access to real-time data via Google Search.

IMPORTANT: Use Google Search to find current, accurate information for this query.
Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Sport context: ${sport || 'general sports'}

User query: ${query}

Provide a comprehensive, accurate analysis with:
1. Current/live statistics and data (search for latest info)
2. Expert-level insights and tactical observations
3. Historical context where relevant
4. Bold predictions backed by data

Be confident, authoritative, and cite your sources.`;

            console.log('[Analyze] Using Gemini 2.0 Flash');

            const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
            const result = await model.generateContent(prompt);
            const response = result.response;

            // Process grounding metadata for sources
            // const grounding = processGroundingMetadata(response);
            // sources = getSourcesArray(grounding);
            // const citations = formatGroundingCitations(grounding);
            // const citations = '';

            response_text = response.text() || 'Analysis unavailable.';
            // console.log('[Analyze] Got', sources.length, 'grounding sources');
        } else {
            console.warn('No GEMINI_API_KEY found - using fallback response');
            response_text = `Analysis for: "${query}"

Based on the ${sport || 'sports'} context, here's what I can tell you:

This is a demo response. To get real AI-powered analysis with Google Search grounding, please configure your GEMINI_API_KEY in the environment variables.

Key insights would normally include:
- Real-time statistics from live searches
- Historical comparisons with cited sources
- Performance trends with data backing
- Expert predictions grounded in current data`;
        }

        return NextResponse.json({
            query,
            sport,
            analysis: response_text,
            structured_content,
            sources,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sports analyze error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
