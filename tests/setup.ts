import "@testing-library/jest-dom";

// Ensure robust in-memory localStorage is available in test environments
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null;
  }
}

if (typeof window !== "undefined") {
  const mockStorage = new LocalStorageMock();
  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
  });
  Object.defineProperty(global, "localStorage", {
    value: mockStorage,
    writable: true,
  });
}
