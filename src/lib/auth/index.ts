/**
 * Authentication Helper Functions
 */

import { db, users, sessions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, SESSION_LIFETIME } from '@/lib/config';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export interface UserPayload {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'user';
}

/**
 * Register a new user
 */
export async function registerUser(
    username: string,
    email: string,
    password: string,
    role: 'admin' | 'user' = 'user'
): Promise<number | null> {
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        const result = db.insert(users).values({
            username,
            email,
            passwordHash,
            role,
            createdAt: new Date().toISOString(),
        }).run();

        return Number(result.lastInsertRowid);
    } catch (error) {
        console.error('Register error:', error);
        return null;
    }
}

/**
 * Check if username exists
 */
export function usernameExists(username: string): boolean {
    const result = db.select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .get();
    return !!result;
}

/**
 * Check if email exists
 */
export function emailExists(email: string): boolean {
    const result = db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .get();
    return !!result;
}

/**
 * Authenticate user with username/email and password
 */
export async function authenticateUser(
    usernameOrEmail: string,
    password: string
): Promise<UserPayload | null> {
    const user = db.select()
        .from(users)
        .where(eq(users.username, usernameOrEmail))
        .get() || db.select()
            .from(users)
            .where(eq(users.email, usernameOrEmail))
            .get();

    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    // Update last login
    db.update(users)
        .set({ lastLogin: new Date().toISOString() })
        .where(eq(users.id, user.id))
        .run();

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role as 'admin' | 'user',
    };
}

/**
 * Create JWT token
 */
export function createToken(user: UserPayload): string {
    return jwt.sign(user, JWT_SECRET, { expiresIn: SESSION_LIFETIME });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): UserPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as UserPayload;
    } catch {
        return null;
    }
}

/**
 * Get current user from cookies
 */
export async function getCurrentUser(): Promise<UserPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;
    return verifyToken(token);
}

/**
 * Get user by ID
 */
export function getUserById(userId: number) {
    return db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
    })
        .from(users)
        .where(eq(users.id, userId))
        .get();
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
    const user = await getCurrentUser();
    return user?.role === 'admin';
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = db.update(users)
        .set({ passwordHash })
        .where(eq(users.id, userId))
        .run();
    return result.changes > 0;
}

/**
 * Create session cookie
 */
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_LIFETIME,
        path: '/',
    });
}

/**
 * Clear session cookie
 */
export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
}
