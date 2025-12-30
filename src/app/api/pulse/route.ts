// Pulse API route

import { NextRequest, NextResponse } from 'next/server';
import { processPulse } from '@/lib/pulse';
import { League } from '@/lib/sports/types';

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type');

        let audioBlob: Uint8Array | undefined;
        let userId: string | undefined;
        let favoriteTeams: string[] = [];
        let favoriteLeagues: League[] = ['NFL', 'NBA'];

        if (contentType?.includes('multipart/form-data')) {
            // Handle audio upload
            const formData = await request.formData();
            const audioFile = formData.get('audio') as File | null;

            if (audioFile) {
                const arrayBuffer = await audioFile.arrayBuffer();
                audioBlob = new Uint8Array(arrayBuffer);
            }

            userId = formData.get('userId') as string | null || undefined;
            const teamsStr = formData.get('favoriteTeams') as string | null;
            if (teamsStr) {
                favoriteTeams = teamsStr.split(',');
            }
            const leaguesStr = formData.get('favoriteLeagues') as string | null;
            if (leaguesStr) {
                favoriteLeagues = leaguesStr.split(',') as League[];
            }
        } else {
            // Handle JSON request (for testing without audio)
            const body = await request.json();
            userId = body.userId;
            favoriteTeams = body.favoriteTeams || [];
            favoriteLeagues = body.favoriteLeagues || ['NFL', 'NBA'];
        }

        const result = await processPulse({
            audioBlob,
            userId,
            favoriteTeams,
            favoriteLeagues,
            timestamp: new Date(),
        });

        if (!result) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'No games found or unable to match audio',
                    data: null,
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                gameId: result.gameId,
                confidence: result.confidence,
                matchReason: result.matchReason,
                game: result.game,
            },
        });
    } catch (error) {
        console.error('Pulse API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process pulse request' },
            { status: 500 }
        );
    }
}
