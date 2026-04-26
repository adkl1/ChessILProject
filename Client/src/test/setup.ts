import '@testing-library/jest-dom';
import { vi } from 'vitest';

function makeLocalStorage() {
    let store: Record<string, string> = {};
    return {
        getItem:    (k: string) => store[k] ?? null,
        setItem:    (k: string, v: string) => { store[k] = String(v); },
        removeItem: (k: string) => { delete store[k]; },
        clear:      () => { store = {}; },
        key:        (i: number) => Object.keys(store)[i] ?? null,
        get length() { return Object.keys(store).length; },
    } as Storage;
}

vi.stubGlobal('localStorage', makeLocalStorage());
