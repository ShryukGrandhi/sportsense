import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        return NextResponse.json({
            interests: ['NFL', 'NBA', 'MLB', 'Soccer', 'NHL']
        });
    } catch (error) {
        console.error('Get interests error:', error);
        return NextResponse.json({ error: 'Failed to get interests' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        return NextResponse.json({
            interests: body.interests || ['NFL', 'NBA', 'MLB']
        });
    } catch (error) {
        console.error('Update interests error:', error);
        return NextResponse.json({ error: 'Failed to update interests' }, { status: 500 });
    }
}
