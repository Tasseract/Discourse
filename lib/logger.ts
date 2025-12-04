// Lightweight logger helper. Controls verbose output in non-production.
export const isDev = process.env.NODE_ENV !== 'production';

export function debug(...args: any[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}

export function info(...args: any[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function warn(...args: any[]) {
  // warnings are useful in production as well
  // eslint-disable-next-line no-console
  console.warn(...args);
}

export function error(...args: any[]) {
  // always surface errors
  // eslint-disable-next-line no-console
  console.error(...args);
}
