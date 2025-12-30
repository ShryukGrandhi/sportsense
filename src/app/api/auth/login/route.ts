import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // For demo purposes, accept any login and return a token
        const user = {
            _id: uuidv4(),
            username: email.split('@')[0],
            email: email,
            interests: ['NFL', 'NBA', 'MLB'],
            subscription: 'free',
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString()
        };

        const token = `token-${uuidv4()}`;

        return NextResponse.json({
            access_token: token,
            user: user
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ detail: 'Login failed' }, { status: 401 });
    }
}
