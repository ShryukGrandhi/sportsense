import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const trending = {
            topics: [
                {
                    id: '1',
                    title: 'NFL Week 16 Highlights',
                    description: 'Key matchups and playoff implications',
                    sport: 'NFL',
                    sentiment: 'positive',
                    engagement: 95000
                },
                {
                    id: '2',
                    title: 'NBA Christmas Day Games',
                    description: 'Lakers vs Warriors headline the holiday slate',
                    sport: 'NBA',
                    sentiment: 'positive',
                    engagement: 82000
                },
                {
                    id: '3',
                    title: 'College Football Playoff Update',
                    description: 'Semifinal matchups set for New Year\'s Eve',
                    sport: 'NCAA',
                    sentiment: 'neutral',
                    engagement: 75000
                },
                {
                    id: '4',
                    title: 'Premier League Boxing Day',
                    description: 'Full slate of matches across England',
                    sport: 'Soccer',
                    sentiment: 'positive',
                    engagement: 65000
                },
                {
                    id: '5',
                    title: 'NHL Winter Classic Preview',
                    description: 'Blackhawks to host Blues at Wrigley Field',
                    sport: 'NHL',
                    sentiment: 'positive',
                    engagement: 45000
                }
            ],
            last_updated: new Date().toISOString()
        };

        return NextResponse.json(trending);
    } catch (error) {
        console.error('Trending error:', error);
        return NextResponse.json({ error: 'Failed to get trending' }, { status: 500 });
    }
}
