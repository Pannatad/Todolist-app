/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const UserProfileContext = createContext();

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error('useUserProfile must be used within a UserProfileProvider');
    }
    return context;
};

const DEFAULT_PROFILE = {
    nickname: '',
    name: '',
    role: '',
    workingHours: { start: '09:00', end: '17:00' },
    focusStyle: 'flexible', // 'deep_work', 'pomodoro', 'flexible'
    routines: {
        morning: '',
        evening: ''
    },
    goals: [],
    preferences: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        proactiveSuggestions: true
    }
};

export const UserProfileProvider = ({ children }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(DEFAULT_PROFILE);
    const [isLoading, setIsLoading] = useState(true);

    // Load profile on mount or user change
    // The loaders intentionally reflect the current authenticated user.
    useEffect(() => {
        if (user) {
            loadProfileFromSupabase();
        } else {
            loadProfileFromLocalStorage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadProfileFromSupabase = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading profile:', error);
            }

            if (data) {
                setProfile({
                    ...DEFAULT_PROFILE,
                    ...data.profile_data
                });
            } else {
                // No profile exists, use defaults with user email name
                setProfile({
                    ...DEFAULT_PROFILE,
                    name: user.email?.split('@')[0] || ''
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadProfileFromLocalStorage = () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem('user_profile');
            if (stored) {
                setProfile({
                    ...DEFAULT_PROFILE,
                    ...JSON.parse(stored)
                });
            }
        } catch (error) {
            console.error('Error loading profile from localStorage:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = async (updates) => {
        const newProfile = { ...profile, ...updates };
        setProfile(newProfile);

        if (user) {
            // Save to Supabase
            try {
                const { error } = await supabase
                    .from('user_profiles')
                    .upsert({
                        user_id: user.id,
                        profile_data: newProfile,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id'
                    });

                if (error) {
                    console.error('Error saving profile:', error);
                }
            } catch (error) {
                console.error('Error saving profile:', error);
            }
        } else {
            // Save to localStorage for guest users
            localStorage.setItem('user_profile', JSON.stringify(newProfile));
        }
    };

    const getProfileSummary = () => {
        // Returns a concise summary for the agent
        const parts = [];
        if (profile.name) parts.push(`Name: ${profile.name}`);
        if (profile.role) parts.push(`Role: ${profile.role}`);
        if (profile.workingHours) parts.push(`Working Hours: ${profile.workingHours}`);
        if (profile.focusStyle) parts.push(`Focus Style: ${profile.focusStyle}`);
        if (profile.goals) parts.push(`Goals: ${profile.goals}`);
        return parts.join(', ') || 'No profile set';
    };

    return (
        <UserProfileContext.Provider
            value={{
                profile,
                isLoading,
                updateProfile,
                getProfileSummary
            }}
        >
            {children}
        </UserProfileContext.Provider>
    );
};

export default UserProfileContext;
