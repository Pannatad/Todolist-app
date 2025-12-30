import React from 'react';
import { AuthProvider } from './AuthContext';
import { TaskProvider } from './TaskContext';
import { GameProvider } from './GameContext';
import { GoalProvider } from './GoalContext';
import { UserProfileProvider } from './UserProfileContext';
import { AgentMemoryProvider } from './AgentMemoryContext';

/**
 * AppProviders wraps the entire app with all context providers
 * Order matters: AuthProvider must be first as others depend on user state
 */
export const AppProviders = ({ children }) => {
    return (
        <AuthProvider>
            <UserProfileProvider>
                <AgentMemoryProvider>
                    <TaskProvider>
                        <GameProvider>
                            <GoalProvider>
                                {children}
                            </GoalProvider>
                        </GameProvider>
                    </TaskProvider>
                </AgentMemoryProvider>
            </UserProfileProvider>
        </AuthProvider>
    );
};
