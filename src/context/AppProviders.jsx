import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { TaskProvider } from './TaskContext';
import { GoalProvider } from './GoalContext';
import { LearningProvider } from './LearningContext';
import { UserProfileProvider } from './UserProfileContext';
import { UserIntelligenceProvider } from './UserIntelligenceContext';
import { AgentMemoryProvider } from './AgentMemoryContext';
import { LinksProvider } from './LinksContext';

// Remount account-owned task data before a different user can see or link it.
const AccountTaskProvider = ({ children }) => {
    const { user } = useAuth();
    return <TaskProvider key={user?.id || 'guest'}>{children}</TaskProvider>;
};

/**
 * AppProviders wraps the entire app with all context providers
 * Order matters: AuthProvider must be first as others depend on user state
 */
export const AppProviders = ({ children }) => {
    return (
        <AuthProvider>
            <UserProfileProvider>
                <UserIntelligenceProvider>
                    <AgentMemoryProvider>
                        <AccountTaskProvider>
                            <LinksProvider>
                                <GoalProvider>
                                    <LearningProvider>
                                        {children}
                                    </LearningProvider>
                                </GoalProvider>
                            </LinksProvider>
                        </AccountTaskProvider>
                    </AgentMemoryProvider>
                </UserIntelligenceProvider>
            </UserProfileProvider>
        </AuthProvider>
    );
};
