import { ChevronRight, MessageCircle, UserRound } from 'lucide-react';
import { TABS } from './tabs';

/** iPadOS-style sidebar used on wide screens in place of the tab bar. */
const Sidebar = ({ selectedTab, onSelect, onAgent, onAccount, account }) => (
  <aside className="sidebar" aria-label="Primary navigation">
    <div className="sidebar__brand">Personal Agent</div>

    <button type="button" className="sidebar__ask" onClick={onAgent}>
      <MessageCircle size={17} strokeWidth={2.1} aria-hidden="true" />
      <span>Ask your agent</span>
    </button>

    <nav className="sidebar__nav">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === selectedTab;
        return (
          <button
            key={tab.id}
            type="button"
            className={`sidebar__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(tab.id)}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.9} aria-hidden="true" />
            <span>{tab.label === 'Uni' ? 'University' : tab.label}</span>
          </button>
        );
      })}
    </nav>

    <button type="button" className="sidebar__account" onClick={onAccount}>
      <span className="nav-avatar sidebar__avatar" aria-hidden="true">
        {account.initials || <UserRound size={17} strokeWidth={2.2} />}
      </span>
      <span className="sidebar__account-copy">
        <strong>{account.name}</strong>
        <span>{account.detail}</span>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  </aside>
);

export default Sidebar;
