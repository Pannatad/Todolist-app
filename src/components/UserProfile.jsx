import React, { useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import ProfileSettings from './ProfileSettings';

function UserProfile() {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const [showSettings, setShowSettings] = useState(false);

    return (
        <>
            <div className="relative group">
                <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="ui-icon-button"
                    aria-label="Open profile settings"
                    title={profile?.nickname || user?.email || 'Set up your profile'}
                >
                    <User size={19} aria-hidden="true" />
                </button>
            </div>

            {/* Profile Settings Modal */}
            <ProfileSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </>
    );
}

export default UserProfile;
