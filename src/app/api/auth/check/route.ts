/**
 * GET /api/auth/check
 * Check authentication status
 */

import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/helpers';

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return errorResponse('Not authenticated', 401);
        }

        return successResponse({
            authenticated: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return errorResponse('Server error', 500);
    }
}
