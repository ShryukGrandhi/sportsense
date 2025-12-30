// SMS webhook route - receives inbound SMS from Twilio

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingSMS, sendSMS, verifyTwilioSignature } from '@/lib/sms';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const params: Record<string, string> = {};
        formData.forEach((value, key) => {
            params[key] = value.toString();
        });

        // Verify Twilio signature in production
        if (process.env.NODE_ENV === 'production') {
            const signature = request.headers.get('X-Twilio-Signature') || '';
            const url = request.url;

            if (!verifyTwilioSignature(signature, url, params)) {
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 403 }
                );
            }
        }

        const from = params.From;
        const body = params.Body;

        if (!from || !body) {
            return NextResponse.json(
                { error: 'Missing From or Body parameter' },
                { status: 400 }
            );
        }

        // Process the message
        const response = await handleIncomingSMS(from, body);

        // Send the response back
        await sendSMS(from, response);

        // Return TwiML empty response
        return new Response(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            {
                headers: {
                    'Content-Type': 'text/xml',
                },
            }
        );
    } catch (error) {
        console.error('SMS webhook error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
