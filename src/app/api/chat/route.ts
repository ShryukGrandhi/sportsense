// Chat API route with streaming

import { NextRequest, NextResponse } from 'next/server';
import { processChatMessage, streamChatMessage } from '@/lib/chat';

export async function POST(request: NextRequest) {
    console.log('Chat API received request');
    try {
        const body = await request.json();
        console.log('Request body parsed:', body.messages?.length);
        const { messages, gameId, teamId, league, stream = false } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Messages array is required' },
                { status: 400 }
            );
        }

        if (stream) {
            // Streaming response
            const encoder = new TextEncoder();
            const readable = new ReadableStream({
                async start(controller) {
                    let visualContext: unknown[] = [];

                    await streamChatMessage(
                        { messages, gameId, teamId, league },
                        (chunk) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
                        }
                    ).then((result) => {
                        visualContext = result.visualContext;
                        // Send final message with visual context
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            done: true,
                            visualContext
                        })}\n\n`));
                        controller.close();
                    });
                },
            });

            return new Response(readable, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // Non-streaming response
        const result = await processChatMessage({ messages, gameId, teamId, league });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process chat message' },
            { status: 500 }
        );
    }
}
