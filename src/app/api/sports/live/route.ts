// Sports API routes

import { NextRequest, NextResponse } from 'next/server';
import { crs } from '@/lib/sports';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const leagues = searchParams.get('leagues')?.split(',') || ['NFL', 'NBA'];
        const date = searchParams.get('date') || undefined;

        const games = await crs.getLiveGames(leagues as ('NFL' | 'NBA')[], date);

        return NextResponse.json({
            success: true,
            data: games,
            cached: false,
        });
    } catch (error) {
        console.error('Failed to fetch live games:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch live games' },
            { status: 500 }
        );
    }
}
