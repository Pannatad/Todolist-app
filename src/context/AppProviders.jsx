import React from 'react';
import { AuthProvider } from './AuthContext';
import { TaskProvider } from './TaskContext';
import { GameProvider } from './GameContext';
import { LogProvider } from './LogContext';
import { GoalProvider } from './GoalContext';

/**
 * AppProviders wraps the entire app with all context providers
 * Order matters: AuthProvider must be first as others depend on user state
 */
export const AppProviders = ({ children }) => {
    return (
        <AuthProvider>
            <TaskProvider>
                <GameProvider>
                    <LogProvider>
                        <GoalProvider>
                            {children}
                        </GoalProvider>
                    </LogProvider>
                </GameProvider>
            </TaskProvider>
        </AuthProvider>
    );
};
