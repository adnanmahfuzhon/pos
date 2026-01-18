import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Local Types (simplified for restored DB compatibility)
interface Branch {
    id: string;
    name: string;
}

interface SafeUser {
    id: string;
    username?: string;
    email?: string;
    role: string;
    branchId?: string | null;
    [key: string]: any; // Allow extra fields from restored DB
}

type MenuKey = string;

const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MANAGER: 'MANAGER',
    STAFF: 'STAFF',
} as const;

type UserRole = string;

interface AuthState {
    user: SafeUser | null;
    branch: Branch | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    selectedBranchId: string | null;
    setSelectedBranchId: (id: string) => void;
    canView: (menu: MenuKey) => boolean;
    canEdit: (menu: MenuKey) => boolean;
    isSuperAdmin: boolean;
    isManager: boolean;
    isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'flavorpos_token';
const SELECTED_BRANCH_KEY = 'flavorpos_selected_branch';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [state, setState] = useState<AuthState>({
        user: null,
        branch: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
    });

    // For Super Admin: track which branch they're viewing
    const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(null);

    // Check token on mount
    useEffect(() => {
        const checkAuth = async () => {
            // BYPASS LOGIC REMOVED

            const storedToken = localStorage.getItem(TOKEN_KEY);
            if (!storedToken) {
                setState(prev => ({ ...prev, isLoading: false }));
                return;
            }


            try {
                const response = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${storedToken}` },
                });

                if (response.ok) {
                    const { user, branch } = await response.json();
                    setState({
                        user,
                        branch,
                        token: storedToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });

                    // Restore selected branch for super admin
                    const savedBranch = localStorage.getItem(SELECTED_BRANCH_KEY);
                    if (user.role === ROLES.SUPER_ADMIN && savedBranch) {
                        setSelectedBranchIdState(savedBranch);
                    } else if (branch) {
                        setSelectedBranchIdState(branch.id);
                    }
                } else {
                    localStorage.removeItem(TOKEN_KEY);
                    setState(prev => ({ ...prev, isLoading: false }));
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem(TOKEN_KEY);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        checkAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login gagal');
        }

        localStorage.setItem(TOKEN_KEY, data.token);

        setState({
            user: data.user,
            branch: data.branch,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
        });

        // Set selected branch
        if (data.branch) {
            setSelectedBranchIdState(data.branch.id);
            localStorage.setItem(SELECTED_BRANCH_KEY, data.branch.id);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SELECTED_BRANCH_KEY);
        setState({
            user: null,
            branch: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
        setSelectedBranchIdState(null);
        window.location.href = '/login';
    }, []);

    const setSelectedBranchId = useCallback((id: string) => {
        setSelectedBranchIdState(id);
        localStorage.setItem(SELECTED_BRANCH_KEY, id);
    }, []);

    // Role checkers - compatible with restored DB role format (super_admin, manager, staff)
    const userRole = (state.user?.role || '').toLowerCase().replace('_', '');
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'super_admin' || state.user?.role === 'SUPER_ADMIN';
    const isManager = userRole === 'manager' || state.user?.role === 'MANAGER';
    const isStaff = userRole === 'staff' || state.user?.role === 'STAFF';

    // Menu permission helpers based on RBAC matrix
    // Super Admin: view all (no edit on operational), Manager: full access, Staff: limited
    const canView = useCallback((menu: string): boolean => {
        if (!state.user) return false;
        const role = state.user.role;

        // Menu access matrix
        const viewAccess: Record<string, string[]> = {
            dashboard: ['SUPER_ADMIN', 'MANAGER'],
            pos: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
            products: ['SUPER_ADMIN', 'MANAGER'],
            ingredients: ['SUPER_ADMIN', 'MANAGER'],
            incomes: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
            expenses: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
            users: ['SUPER_ADMIN', 'MANAGER'],
            branches: ['SUPER_ADMIN'],
        };

        const allowed = viewAccess[menu.toLowerCase()] || [];
        return allowed.includes(role);
    }, [state.user]);

    const canEdit = useCallback((menu: string): boolean => {
        if (!state.user) return false;
        const role = state.user.role;

        // Super Admin cannot edit operational data (view only)
        if (role === 'SUPER_ADMIN') {
            // Super Admin can only edit users and branches management
            return ['users', 'branches'].includes(menu.toLowerCase());
        }

        // Edit access matrix for Manager and Staff
        const editAccess: Record<string, string[]> = {
            dashboard: ['MANAGER'],
            pos: ['MANAGER', 'STAFF'],
            products: ['MANAGER'],
            ingredients: ['MANAGER'],
            incomes: ['MANAGER', 'STAFF'],
            expenses: ['MANAGER', 'STAFF'],
            users: ['MANAGER'], // Manager can only manage staff
            branches: [], // Only Super Admin
        };

        const allowed = editAccess[menu.toLowerCase()] || [];
        return allowed.includes(role);
    }, [state.user]);

    const value: AuthContextType = {
        ...state,
        login,
        logout,
        selectedBranchId,
        setSelectedBranchId,
        canView,
        canEdit,
        isSuperAdmin,
        isManager,
        isStaff,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    options?: { allowedRoles?: UserRole[]; redirectTo?: string }
) {
    return function WithAuthComponent(props: P) {
        const { isAuthenticated, isLoading, user } = useAuth();

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                window.location.href = options?.redirectTo || '/login';
            }

            if (!isLoading && isAuthenticated && options?.allowedRoles) {
                if (!options.allowedRoles.includes(user?.role as UserRole)) {
                    window.location.href = '/';
                }
            }
        }, [isLoading, isAuthenticated, user]);

        if (isLoading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                    <div className="animate-pulse text-slate-400">Loading...</div>
                </div>
            );
        }

        if (!isAuthenticated) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };
}
