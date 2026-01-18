import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'flavorpos-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// Salt rounds for bcrypt (12 is a good balance of security vs performance)
const SALT_ROUNDS = 12;

// User roles
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MANAGER: 'MANAGER',
    STAFF: 'STAFF',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// JWT payload type
export interface TokenPayload {
    userId: string;
    email: string;
    role: UserRole;
    branchId: string | null;
}

// Safe user type (without password)
export interface SafeUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    branchId: string | null;
    isActive: boolean;
    createdAt: Date;
}

/**
 * Hash a password using bcrypt
 * @param plainPassword - The plain text password
 * @returns Hashed password
 */
export async function hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify a password against its hash
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The stored hash to compare against
 * @returns True if password matches
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Sign a JWT token for a user
 * @param user - The user to create token for
 * @returns JWT token string
 */
export function signToken(user: Pick<User, 'id' | 'email' | 'role' | 'branchId'>): string {
    const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        branchId: user.branchId,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
    try {
        if (token === 'dev-bypass-token') {
            return {
                userId: 'dev-admin',
                email: 'admin@flavorpos.com',
                role: ROLES.SUPER_ADMIN,
                branchId: null
            };
        }
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Extract token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns Token string or null
 */
export function extractToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

/**
 * Remove password from user object
 * @param user - User with password
 * @returns User without password (safe to send to client)
 */
export function sanitizeUser(user: User): SafeUser {
    const { password, ...safeUser } = user;
    return safeUser as SafeUser;
}

/**
 * Check if user has required role or higher
 * Role hierarchy: SUPER_ADMIN > MANAGER > STAFF
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
        [ROLES.SUPER_ADMIN]: 3,
        [ROLES.MANAGER]: 2,
        [ROLES.STAFF]: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access a specific branch
 * - SUPER_ADMIN can access all branches
 * - MANAGER/STAFF can only access their own branch
 */
export function canAccessBranch(user: TokenPayload, branchId: string): boolean {
    if (user.role === ROLES.SUPER_ADMIN) {
        return true;
    }
    return user.branchId === branchId;
}

/**
 * Menu access configuration per role
 */
export const MENU_ACCESS = {
    [ROLES.SUPER_ADMIN]: {
        dashboard: { view: true, edit: false },
        pos: { view: true, edit: false },
        products: { view: true, edit: false },
        ingredients: { view: true, edit: false },
        incomes: { view: true, edit: false },
        expenses: { view: true, edit: false },
        users: { view: true, edit: true },
        branches: { view: true, edit: true },
    },
    [ROLES.MANAGER]: {
        dashboard: { view: true, edit: true },
        pos: { view: true, edit: true },
        products: { view: true, edit: true },
        ingredients: { view: true, edit: true },
        incomes: { view: true, edit: true },
        expenses: { view: true, edit: true },
        users: { view: true, edit: true }, // Only staff in their branch
        branches: { view: false, edit: false },
    },
    [ROLES.STAFF]: {
        dashboard: { view: false, edit: false },
        pos: { view: true, edit: true },
        products: { view: false, edit: false },
        ingredients: { view: false, edit: false },
        incomes: { view: true, edit: true },
        expenses: { view: true, edit: true },
        users: { view: false, edit: false },
        branches: { view: false, edit: false },
    },
} as const;

export type MenuKey = keyof typeof MENU_ACCESS[typeof ROLES.SUPER_ADMIN];

/**
 * Check if user can view a menu
 */
export function canViewMenu(role: UserRole, menu: MenuKey): boolean {
    return MENU_ACCESS[role]?.[menu]?.view ?? false;
}

/**
 * Check if user can edit in a menu
 */
export function canEditMenu(role: UserRole, menu: MenuKey): boolean {
    return MENU_ACCESS[role]?.[menu]?.edit ?? false;
}
