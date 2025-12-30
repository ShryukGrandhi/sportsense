import { NextRequest, NextResponse } from 'next/server';

// In-memory chat storage reference
const chats: Map<string, { id: string; title: string; messages: any[]; created_at: string }> = new Map();

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params;
        const body = await request.json();
        const { title } = body;

        const chat = chats.get(chatId);

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        chat.title = title;
        chats.set(chatId, chat);

        return NextResponse.json({
            id: chat.id,
            _id: chat.id,
            title: chat.title,
            created_at: chat.created_at
        });
    } catch (error) {
        console.error('Update chat title error:', error);
        return NextResponse.json({ error: 'Failed to update chat title' }, { status: 500 });
    }
}
