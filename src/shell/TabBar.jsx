import { LayoutGrid, MessageCircle } from 'lucide-react';
import { useMediaQuery } from '../ui';
import { MORE_TAB_IDS, PRIMARY_TAB_IDS, TABS } from './tabs';

const TabIcon = ({ icon, active }) => {
  const Icon = icon;
  return (
    <Icon
      size={23}
      strokeWidth={active ? 2.2 : 1.85}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.16 : 0}
      aria-hidden="true"
    />
  );
};

/**
 * Floating iOS 26 tab bar: a material capsule with a selection lens that
 * glides between tabs, plus a detached circular button for the agent.
 * Phones show four tabs and "More"; tablets have room for every tab.
 */
const TabBar = ({ selectedTab, onSelect, onMore, moreOpen, onAgent }) => {
  const showAllTabs = useMediaQuery('(min-width: 40rem)');
  const tabItems = TABS
    .filter((tab) => showAllTabs || PRIMARY_TAB_IDS.includes(tab.id))
    .map((tab) => ({
      ...tab,
      active: tab.id === selectedTab,
      onClick: () => onSelect(tab.id),
    }));
  const items = showAllTabs ? tabItems : [
    ...tabItems,
    {
      id: 'more',
      label: 'More',
      icon: LayoutGrid,
      active: MORE_TAB_IDS.includes(selectedTab),
      onClick: onMore,
      popup: true,
    },
  ];
  const activeIndex = items.findIndex((item) => item.active);

  return (
    <div className="tab-bar-dock">
      <nav
        className={`tab-bar${showAllTabs ? ' tab-bar--all' : ''}`}
        aria-label="Primary navigation"
        style={{ '--tab-count': items.length, '--tab-index': Math.max(0, activeIndex) }}
      >
        <span className="tab-bar__lens" aria-hidden="true" data-hidden={activeIndex < 0 ? 'true' : undefined} />
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab-bar__item${item.active ? ' is-active' : ''}`}
            aria-current={item.active ? 'page' : undefined}
            aria-haspopup={item.popup ? 'dialog' : undefined}
            aria-expanded={item.popup ? moreOpen : undefined}
            onClick={item.onClick}
          >
            <TabIcon icon={item.icon} active={item.active} />
            <span className="tab-bar__label">{item.label}</span>
          </button>
        ))}
      </nav>
      <button type="button" className="tab-bar-agent" onClick={onAgent} aria-label="Ask your agent" title="Ask your agent">
        <MessageCircle size={23} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};

export default TabBar;
