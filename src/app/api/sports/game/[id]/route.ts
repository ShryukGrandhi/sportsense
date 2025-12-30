// Game detail API route

import { NextRequest, NextResponse } from 'next/server';
import { crs } from '@/lib/sports';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: gameId } = await params;

        if (!gameId) {
            return NextResponse.json(
                { success: false, error: 'Game ID is required' },
                { status: 400 }
            );
        }

        const game = await crs.getGameWithStats(gameId);

        if (!game) {
            return NextResponse.json(
                { success: false, error: 'Game not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: game,
        });
    } catch (error) {
        console.error('Failed to fetch game details:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch game details' },
            { status: 500 }
        );
    }
}
