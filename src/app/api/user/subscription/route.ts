import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        return NextResponse.json({
            plan: 'premium',
            status: 'active',
            features: ['unlimited_chats', 'real_time_scores', 'ai_analysis', 'video_highlights'],
            expires_at: null
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
    }
}
