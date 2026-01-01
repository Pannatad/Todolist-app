import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

import useSound from 'use-sound';

const GameContext = createContext();

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within GameProvider');
    }
    return context;
};

export const GameProvider = ({ children }) => {
    const { user } = useAuth();

    // Game State
    const [coins, setCoins] = useState(() => {
        try {
            const saved = localStorage.getItem('growth-coins');
            const parsed = saved ? parseInt(saved) : 0;
            return isNaN(parsed) ? 0 : parsed;
        } catch (e) {
            console.error("Failed to parse coins:", e);
            return 0;
        }
    });

    const [unlockedPlots, setUnlockedPlots] = useState(() => {
        try {
            const saved = localStorage.getItem('growth-plots');
            const parsed = saved ? parseInt(saved) : 12;
            return isNaN(parsed) ? 12 : parsed;
        } catch (e) {
            console.error("Failed to parse unlockedPlots:", e);
            return 12;
        }
    });

    const [displayMode, setDisplayMode] = useState('minimal');

    // Persona State
    const [personaMessage, setPersonaMessage] = useState('');
    const [isPersonaTyping, setIsPersonaTyping] = useState(false);

    // Sounds
    const soundEnabled = true;
    const [playComplete] = useSound('/sounds/water.mp3', { volume: 0.5 });

    // Load from Supabase
    const loadGameDataFromSupabase = async () => {
        if (!user) return;

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                setCoins(profile.coins);
                setUnlockedPlots(profile.unlocked_plots);
                setDisplayMode(profile.display_mode || 'minimal');
            }
        } catch (error) {
            console.error("Error loading game data:", error);
        }
    };

    useEffect(() => {
        if (user) {
            loadGameDataFromSupabase();
        }
    }, [user]);

    // Save to LocalStorage (Guest Mode)
    useEffect(() => {
        if (!user) {
            localStorage.setItem('growth-coins', coins.toString());
            localStorage.setItem('growth-plots', unlockedPlots.toString());
        }
    }, [coins, unlockedPlots, user]);

    // Game Handlers
    const earnCoins = async (amount) => {
        setCoins(prev => {
            const newCoins = prev + amount;
            if (user) {
                supabase.from('profiles').update({ coins: newCoins }).eq('id', user.id).then();
            }
            return newCoins;
        });
        if (soundEnabled) playComplete();
        return amount;
    };

    const spendCoins = async (amount) => {
        if (coins < amount) return false;

        setCoins(prev => {
            const newCoins = prev - amount;
            if (user) {
                supabase.from('profiles').update({ coins: newCoins }).eq('id', user.id).then();
            }
            return newCoins;
        });
        return true;
    };

    const buyPlot = async () => {
        const cost = 50;
        if (coins >= cost) {
            setCoins(prev => {
                const newCoins = prev - cost;
                if (user) supabase.from('profiles').update({ coins: newCoins }).eq('id', user.id).then();
                return newCoins;
            });
            setUnlockedPlots(prev => {
                const newPlots = prev + 1;
                if (user) supabase.from('profiles').update({ unlocked_plots: newPlots }).eq('id', user.id).then();
                return newPlots;
            });
            return true;
        }
        return false;
    };

    const cycleDisplayMode = async () => {
        const modes = ['demon', 'penguin', 'minimal'];
        const currentIndex = modes.indexOf(displayMode);
        const newMode = modes[(currentIndex + 1) % modes.length];
        setDisplayMode(newMode);
        if (user) {
            await supabase.from('profiles').update({ display_mode: newMode }).eq('id', user.id);
        }
    };

    // Persona reaction feature removed to save API tokens
    const triggerPersonaReaction = async (action, taskTitle) => {
        // No-op - feature disabled
    };

    const value = {
        coins,
        unlockedPlots,
        displayMode,
        personaMessage,
        isPersonaTyping,
        earnCoins,
        spendCoins,
        buyPlot,
        cycleDisplayMode,
        triggerPersonaReaction
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};
