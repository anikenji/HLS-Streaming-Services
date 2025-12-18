/**
 * POST /api/auth/login
 * User login
 */

import { NextRequest } from 'next/server';
import { authenticateUser, createToken, setAuthCookie } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/helpers';

export async function POST(request: NextRequest) {
    try {
        console.log('[Login] Processing login request...');

        const body = await request.json();
        const { username, password } = body;

        console.log('[Login] Username:', username);

        // Validate input
        if (!username || !password) {
            return errorResponse('Username and password are required');
        }

        // Authenticate
        console.log('[Login] Authenticating user...');
        const user = await authenticateUser(username, password);

        if (!user) {
            console.log('[Login] Authentication failed - invalid credentials');
            return errorResponse('Invalid credentials', 401);
        }

        console.log('[Login] User authenticated:', user.username);

        // Create token and set cookie
        const token = createToken(user);
        console.log('[Login] Token created');

        await setAuthCookie(token);
        console.log('[Login] Cookie set');

        return successResponse({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            }
        });
    } catch (error) {
        console.error('[Login] Error:', error);
        console.error('[Login] Stack:', error instanceof Error ? error.stack : 'No stack');
        return errorResponse('Server error: ' + (error instanceof Error ? error.message : 'Unknown'), 500);
    }
}
