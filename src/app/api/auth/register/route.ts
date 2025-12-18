/**
 * POST /api/auth/register
 * Register new user
 */

import { NextRequest } from 'next/server';
import { registerUser, usernameExists, emailExists, authenticateUser, createToken, setAuthCookie } from '@/lib/auth';
import { errorResponse, successResponse, validateEmail, validateUsername, validatePassword } from '@/lib/helpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, email, password } = body;

        // Validate input
        if (!username || !email || !password) {
            return errorResponse('All fields are required');
        }

        if (!validateUsername(username)) {
            return errorResponse('Username must be 3-50 characters, alphanumeric and underscore only');
        }

        if (!validateEmail(email)) {
            return errorResponse('Invalid email format');
        }

        if (!validatePassword(password)) {
            return errorResponse('Password must be at least 6 characters');
        }

        // Check if username/email exists
        if (usernameExists(username)) {
            return errorResponse('Username already taken');
        }

        if (emailExists(email)) {
            return errorResponse('Email already registered');
        }

        // Register user
        const userId = await registerUser(username, email, password);

        if (!userId) {
            return errorResponse('Registration failed', 500);
        }

        return successResponse({ userId }, 'Registration successful');
    } catch (error) {
        console.error('Register error:', error);
        return errorResponse('Server error', 500);
    }
}
