import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Lazy initialization of Gemini client
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new GoogleGenAI({ apiKey });
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

        // Generate AI analysis with Gemini
        const ai = getGenAI();

        if (ai) {
            const prompt = `You are a sports analyst. Analyze the following sports query and provide detailed insights.
If relevant, include structured data for scores, player stats, or comparisons.
Sport context: ${sport || 'general'}

User query: ${query}

Provide a comprehensive, accurate analysis with specific statistics and data when available.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            response_text = response.text || 'Analysis unavailable.';
        } else {
            console.warn('No GEMINI_API_KEY found - using fallback response');
            response_text = `Analysis for: "${query}"

Based on the ${sport || 'sports'} context, here's what I can tell you:

This is a demo response. To get real AI-powered analysis, please configure your GEMINI_API_KEY in the environment variables.

Key insights would normally include:
- Statistical breakdowns
- Historical comparisons  
- Performance trends
- Expert predictions`;
        }

        return NextResponse.json({
            query,
            sport,
            analysis: response_text,
            structured_content,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sports analyze error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
