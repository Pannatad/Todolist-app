import {
  BookOpen,
  CalendarDays,
  CircleCheckBig,
  FolderKanban,
  GraduationCap,
  Repeat2,
  SunMedium,
} from 'lucide-react';

export const TABS = [
  { id: 'today', label: 'Today', icon: SunMedium },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: CircleCheckBig },
  { id: 'uni-board', label: 'Uni', icon: GraduationCap },
  { id: 'habits', label: 'Habits', icon: Repeat2, tint: '#34c759' },
  { id: 'learning', label: 'Learning', icon: BookOpen, tint: '#ff9500' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, tint: '#007aff' },
];

export const PRIMARY_TAB_IDS = ['today', 'plan', 'tasks', 'uni-board'];
export const MORE_TAB_IDS = ['habits', 'learning', 'projects'];
export const TAB_IDS = TABS.map((tab) => tab.id);

export const TAB_ALIASES = {
  overview: 'today',
  schedule: 'plan',
  garden: 'tasks',
  focus: 'tasks',
  ideas: 'projects',
  vision: 'today',
  sleep: 'habits',
  uni: 'uni-board',
  university: 'uni-board',
  uniboard: 'uni-board',
};

export const resolveTab = (tabId) => {
  const next = TAB_ALIASES[tabId] || tabId;
  return TAB_IDS.includes(next) ? next : null;
};
