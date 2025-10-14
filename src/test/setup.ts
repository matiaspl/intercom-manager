// Vitest + React Testing Library setup
import '@testing-library/jest-dom/vitest';

// Add any global mocks here if needed
// Example: matchMedia for components that query it
if (!('matchMedia' in window)) {
  // @ts-expect-error - define for tests only
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

