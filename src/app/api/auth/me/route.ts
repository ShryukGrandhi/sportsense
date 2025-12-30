import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    try {
        // For demo, return a user based on auth header
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
        }

        // Return demo user
        const user = {
            _id: 'demo-user',
            username: 'Demo User',
            email: 'demo@sportsense.ai',
            interests: ['NFL', 'NBA', 'MLB', 'Soccer'],
            subscription: 'premium',
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
        };

        return NextResponse.json(user);
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ detail: 'Authentication failed' }, { status: 401 });
    }
}
