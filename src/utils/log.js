export const log = (...args) => {
  if (import.meta.env.DEV) console.debug(...args);
};
