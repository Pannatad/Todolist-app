import { ChevronRight, LogIn, LogOut, UserRound } from 'lucide-react';
import { SegmentedControl, Sheet } from '../ui';
import { MORE_TAB_IDS, TABS } from './tabs';

const APPEARANCE_OPTIONS = [
  { id: 'system', label: 'Automatic' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export const AccountSheet = ({ open, onClose, account, signedIn, appearance, onAppearanceChange, onOpenProfile, onSignIn, onSignOut }) => (
  <Sheet open={open} onClose={onClose} title="Account" className="shell-sheet">
    <div className="ui-group">
      <button type="button" className="ui-list-row shell-account-row" onClick={onOpenProfile}>
        <span className="nav-avatar shell-account-row__avatar" aria-hidden="true">
          {account.initials || <UserRound size={24} strokeWidth={2} />}
        </span>
        <span className="ui-list-row__copy">
          <span className="ui-list-row__title shell-account-row__name">{account.name}</span>
          <span className="ui-list-row__subtitle">{account.detail}</span>
        </span>
        <ChevronRight size={18} className="shell-chevron" aria-hidden="true" />
      </button>
    </div>

    <p className="shell-group-label">Appearance</p>
    <SegmentedControl
      items={APPEARANCE_OPTIONS}
      value={appearance}
      onChange={onAppearanceChange}
      ariaLabel="Appearance"
      className="shell-appearance"
    />

    <div className="ui-group shell-group-gap">
      {signedIn ? (
        <button type="button" className="ui-list-row shell-row--destructive" onClick={onSignOut}>
          <LogOut size={19} aria-hidden="true" />
          <span className="ui-list-row__title">Sign Out</span>
        </button>
      ) : (
        <button type="button" className="ui-list-row shell-row--tinted" onClick={onSignIn}>
          <LogIn size={19} aria-hidden="true" />
          <span className="ui-list-row__title">Sign In</span>
        </button>
      )}
    </div>
  </Sheet>
);

export const MoreSheet = ({ open, onClose, selectedTab, onSelect }) => (
  <Sheet open={open} onClose={onClose} title="More" className="shell-sheet">
    <div className="ui-group">
      {TABS.filter((tab) => MORE_TAB_IDS.includes(tab.id)).map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className="ui-list-row shell-more-row"
            aria-current={selectedTab === tab.id ? 'page' : undefined}
            onClick={() => onSelect(tab.id)}
          >
            <span className="ui-list-row__icon" style={{ background: tab.tint }} aria-hidden="true">
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <span className="ui-list-row__title">{tab.label}</span>
            <ChevronRight size={18} className="shell-chevron" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  </Sheet>
);
