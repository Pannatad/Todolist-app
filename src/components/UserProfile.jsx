import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function UserProfile() {
    const { user } = useAuth();

    // Don't render if no user is logged in
    if (!user) return null;

    return (
        <div className="relative group">
            {/* Profile Icon */}
            <div className="p-2.5 sm:p-4 rounded-full bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 cursor-pointer">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-sage-600 dark:text-bone-200 group-hover:text-sage-800 dark:group-hover:text-magma-400 transition-colors" />
            </div>

            {/* Tooltip - Custom Tailwind CSS implementation */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-void-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
                {user.email}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-gray-900 dark:border-t-void-900"></div>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
