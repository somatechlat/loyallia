// Setup file for vitest + jsdom
// Add custom matchers or global mocks here if needed
import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// jsdom's localStorage methods are not real functions in some environments.
// Provide a working in-memory Storage implementation for all tests.
const storage: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { for (const k of Object.keys(storage)) delete storage[k]; },
    key: (index: number) => Object.keys(storage)[index] ?? null,
    get length() { return Object.keys(storage).length; },
  },
  writable: true,
});

// Set English locale for all tests so assertions match en.json translations
beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k];
  storage['loyallia_lang'] = 'en';
});
