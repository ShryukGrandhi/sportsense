// SMS service with Twilio integration

import Twilio from 'twilio';
import prisma from '../db';
import { processChatMessage } from '../chat';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client (lazy)
let twilioClient: Twilio.Twilio | null = null;

function getTwilioClient(): Twilio.Twilio {
    if (!twilioClient) {
        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not configured');
        }
        twilioClient = Twilio(accountSid, authToken);
    }
    return twilioClient;
}

/**
 * Send an SMS message
 */
export async function sendSMS(to: string, body: string): Promise<boolean> {
    try {
        const client = getTwilioClient();
        await client.messages.create({
            body,
            from: twilioPhoneNumber,
            to,
        });
        return true;
    } catch (error) {
        console.error('Failed to send SMS:', error);
        return false;
    }
}

/**
 * Handle incoming SMS webhook
 */
export async function handleIncomingSMS(
    from: string,
    body: string
): Promise<string> {
    // Find or create user by phone number
    let user = await prisma.user.findUnique({
        where: { phoneNumber: from },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                phoneNumber: from,
                favoriteLeagues: ['NFL', 'NBA'],
            },
        });
    }

    // Process message through chat engine
    const response = await processChatMessage({
        messages: [{ role: 'user', content: body }],
    });

    // Truncate response for SMS (160 char limit for single SMS)
    let smsResponse = response.answerText;
    if (smsResponse.length > 300) {
        smsResponse = smsResponse.substring(0, 297) + '...';
    }

    return smsResponse;
}

/**
 * Verify Twilio webhook signature
 */
export function verifyTwilioSignature(
    signature: string,
    url: string,
    params: Record<string, string>
): boolean {
    try {
        const client = getTwilioClient();
        return Twilio.validateRequest(
            authToken!,
            signature,
            url,
            params
        );
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
}

/**
 * Send verification code
 */
export async function sendVerificationCode(phoneNumber: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const sent = await sendSMS(
        phoneNumber,
        `Your Playmaker verification code is: ${code}. Valid for 10 minutes.`
    );

    if (!sent) {
        throw new Error('Failed to send verification code');
    }

    return code;
}

/**
 * Add notification preference
 */
export async function addNotificationPreference(
    userId: string,
    preference: {
        type: 'team' | 'player' | 'event';
        teamId?: string;
        playerId?: string;
        tag?: string;
        quietHoursStart?: number;
        quietHoursEnd?: number;
    }
): Promise<void> {
    await prisma.notificationPreference.create({
        data: {
            userId,
            type: preference.type,
            teamId: preference.teamId,
            playerId: preference.playerId,
            tag: preference.tag,
            quietHoursStart: preference.quietHoursStart,
            quietHoursEnd: preference.quietHoursEnd,
            enabled: true,
        },
    });
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: string) {
    return prisma.notificationPreference.findMany({
        where: { userId, enabled: true },
    });
}

/**
 * Toggle notification preference
 */
export async function toggleNotificationPreference(
    preferenceId: string,
    enabled: boolean
): Promise<void> {
    await prisma.notificationPreference.update({
        where: { id: preferenceId },
        data: { enabled },
    });
}

/**
 * Delete notification preference
 */
export async function deleteNotificationPreference(
    preferenceId: string
): Promise<void> {
    await prisma.notificationPreference.delete({
        where: { id: preferenceId },
    });
}

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(
    quietHoursStart: number | null,
    quietHoursEnd: number | null
): boolean {
    if (quietHoursStart === null || quietHoursEnd === null) {
        return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    if (quietHoursStart < quietHoursEnd) {
        // Simple case: quiet hours don't cross midnight
        return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
    } else {
        // Quiet hours cross midnight
        return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
    }
}

/**
 * Find subscribers for a specific event
 */
export async function findSubscribers(
    eventType: string,
    teamId?: string,
    playerId?: string
): Promise<Array<{ userId: string; phoneNumber: string }>> {
    const preferences = await prisma.notificationPreference.findMany({
        where: {
            enabled: true,
            OR: [
                { tag: eventType },
                { teamId: teamId },
                { playerId: playerId },
            ],
        },
        include: {
            user: {
                select: {
                    id: true,
                    phoneNumber: true,
                },
            },
        },
    });

    // Filter out users in quiet hours and without phone numbers
    return preferences
        .filter(p =>
            p.user.phoneNumber &&
            !isQuietHours(p.quietHoursStart, p.quietHoursEnd)
        )
        .map(p => ({
            userId: p.user.id,
            phoneNumber: p.user.phoneNumber!,
        }));
}

/**
 * Send notification to subscribers
 */
export async function notifySubscribers(
    eventType: string,
    message: string,
    teamId?: string,
    playerId?: string
): Promise<number> {
    const subscribers = await findSubscribers(eventType, teamId, playerId);

    // Deduplicate by phone number
    const uniqueSubscribers = new Map<string, string>();
    subscribers.forEach(s => {
        uniqueSubscribers.set(s.phoneNumber, s.userId);
    });

    let sentCount = 0;
    for (const [phoneNumber] of uniqueSubscribers) {
        const sent = await sendSMS(phoneNumber, message);
        if (sent) sentCount++;
    }

    return sentCount;
}
