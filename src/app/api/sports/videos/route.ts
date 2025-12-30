import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    try {
        const videos = {
            videos: [
                {
                    id: '1',
                    title: 'Top 10 NFL Plays of Week 16',
                    thumbnail: 'https://via.placeholder.com/320x180?text=NFL+Highlights',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    duration: '8:45',
                    source: 'NFL',
                    sport: 'NFL',
                    published_at: new Date().toISOString()
                },
                {
                    id: '2',
                    title: 'NBA Best Dunks - December 2024',
                    thumbnail: 'https://via.placeholder.com/320x180?text=NBA+Dunks',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    duration: '5:30',
                    source: 'NBA',
                    sport: 'NBA',
                    published_at: new Date().toISOString()
                },
                {
                    id: '3',
                    title: 'Premier League Goals of the Week',
                    thumbnail: 'https://via.placeholder.com/320x180?text=Soccer+Goals',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    duration: '6:15',
                    source: 'Premier League',
                    sport: 'Soccer',
                    published_at: new Date().toISOString()
                }
            ],
            total: 3,
            last_updated: new Date().toISOString()
        };

        return NextResponse.json(videos);
    } catch (error) {
        console.error('Videos error:', error);
        return NextResponse.json({ error: 'Failed to get videos' }, { status: 500 });
    }
}
