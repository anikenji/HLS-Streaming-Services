/**
 * POST /api/auth/logout
 * User logout
 */

import { clearAuthCookie } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/helpers';

export async function POST() {
    try {
        await clearAuthCookie();
        return successResponse({}, 'Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        return errorResponse('Server error', 500);
    }
}
