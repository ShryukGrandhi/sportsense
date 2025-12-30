import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Shared chat storage - in production, use a database
const chats: Map<string, { id: string; title: string; messages: any[]; created_at: string }> = new Map();

// Initialize with a default chat
if (chats.size === 0) {
    const defaultId = 'default-chat';
    chats.set(defaultId, {
        id: defaultId,
        title: 'Welcome Chat',
        messages: [],
        created_at: new Date().toISOString()
    });
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params;

        let chat = chats.get(chatId);

        // If chat doesn't exist, create it
        if (!chat) {
            chat = {
                id: chatId,
                title: 'New Chat',
                messages: [],
                created_at: new Date().toISOString()
            };
            chats.set(chatId, chat);
        }

        return NextResponse.json({
            chat: {
                id: chat.id,
                _id: chat.id,
                title: chat.title,
                created_at: chat.created_at
            },
            messages: chat.messages.map(msg => ({
                ...msg,
                id: msg.id,
                _id: msg.id
            }))
        });
    } catch (error) {
        console.error('Get chat error:', error);
        return NextResponse.json({ error: 'Failed to get chat' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    try {
        const { chatId } = await params;

        if (chats.has(chatId)) {
            chats.delete(chatId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    } catch (error) {
        console.error('Delete chat error:', error);
        return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
    }
}

// Export chats for use by messages route
export { chats };
