import React from 'react';
import { AuthProvider } from './AuthContext';
import { TaskProvider } from './TaskContext';
import { GoalProvider } from './GoalContext';
import { LearningProvider } from './LearningContext';
import { UserProfileProvider } from './UserProfileContext';
import { UserIntelligenceProvider } from './UserIntelligenceContext';
import { AgentMemoryProvider } from './AgentMemoryContext';

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
                        <TaskProvider>
                            <GoalProvider>
                                <LearningProvider>
                                    {children}
                                </LearningProvider>
                            </GoalProvider>
                        </TaskProvider>
                    </AgentMemoryProvider>
                </UserIntelligenceProvider>
            </UserProfileProvider>
        </AuthProvider>
    );
};
