import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory chat storage (in production, use a database)
const chats: Map<string, { id: string; title: string; messages: any[]; created_at: string }> = new Map();

export async function GET() {
    try {
        const chatList = Array.from(chats.values()).map(chat => ({
            id: chat.id,
            _id: chat.id,
            title: chat.title,
            created_at: chat.created_at,
            message_count: chat.messages.length
        }));

        return NextResponse.json(chatList);
    } catch (error) {
        console.error('Get chats error:', error);
        return NextResponse.json({ error: 'Failed to get chats' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title = 'New Chat' } = body;

        const chatId = uuidv4();
        const chat = {
            id: chatId,
            _id: chatId,
            title,
            messages: [],
            created_at: new Date().toISOString()
        };

        chats.set(chatId, chat);

        return NextResponse.json(chat);
    } catch (error) {
        console.error('Create chat error:', error);
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }
}
