import { createContext, useContext } from 'react';

/** Shared chrome hooks the pages need from the app shell (account sheet, navigation). */
export const ShellContext = createContext({
  openAccount: () => {},
  account: { initials: '', label: 'Account' },
  navigate: () => {},
});

export const useShell = () => useContext(ShellContext);
