// Notification subscription API route

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
    addNotificationPreference,
    getNotificationPreferences,
    toggleNotificationPreference,
    deleteNotificationPreference
} from '@/lib/sms';

// Get user preferences
export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID required' },
                { status: 400 }
            );
        }

        const preferences = await getNotificationPreferences(userId);

        return NextResponse.json({
            success: true,
            data: preferences,
        });
    } catch (error) {
        console.error('Failed to get preferences:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get preferences' },
            { status: 500 }
        );
    }
}

// Add new preference
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, type, teamId, playerId, tag, quietHoursStart, quietHoursEnd } = body;

        if (!userId || !type) {
            return NextResponse.json(
                { success: false, error: 'User ID and type required' },
                { status: 400 }
            );
        }

        await addNotificationPreference(userId, {
            type,
            teamId,
            playerId,
            tag,
            quietHoursStart,
            quietHoursEnd,
        });

        return NextResponse.json({
            success: true,
            message: 'Preference added',
        });
    } catch (error) {
        console.error('Failed to add preference:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to add preference' },
            { status: 500 }
        );
    }
}

// Update preference (toggle)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { preferenceId, enabled } = body;

        if (!preferenceId || enabled === undefined) {
            return NextResponse.json(
                { success: false, error: 'Preference ID and enabled status required' },
                { status: 400 }
            );
        }

        await toggleNotificationPreference(preferenceId, enabled);

        return NextResponse.json({
            success: true,
            message: 'Preference updated',
        });
    } catch (error) {
        console.error('Failed to update preference:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update preference' },
            { status: 500 }
        );
    }
}

// Delete preference
export async function DELETE(request: NextRequest) {
    try {
        const preferenceId = request.nextUrl.searchParams.get('preferenceId');

        if (!preferenceId) {
            return NextResponse.json(
                { success: false, error: 'Preference ID required' },
                { status: 400 }
            );
        }

        await deleteNotificationPreference(preferenceId);

        return NextResponse.json({
            success: true,
            message: 'Preference deleted',
        });
    } catch (error) {
        console.error('Failed to delete preference:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete preference' },
            { status: 500 }
        );
    }
}
