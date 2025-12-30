import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        // For demo, just return the updated profile data
        const user = {
            _id: 'demo-user',
            username: body.username || 'Demo User',
            email: body.email || 'demo@sportsense.ai',
            interests: body.interests || ['NFL', 'NBA', 'MLB'],
            subscription: 'premium',
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
        };

        return NextResponse.json(user);
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ detail: 'Profile update failed' }, { status: 500 });
    }
}
