import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Store all localStorage subscribers
const subscribers = new Map<string, Set<() => void>>();

// More robust storage manager
const storageManager = {
  getItem<T>(key: string): T | null {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  setItem<T>(key: string, value: T): void {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Notify all subscribers for this key
    const keySubscribers = subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.forEach(callback => callback());
    }
  },
  
  subscribe(key: string, callback: () => void): () => void {
    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
    }
    subscribers.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const keySubscribers = subscribers.get(key);
      if (keySubscribers) {
        keySubscribers.delete(callback);
        if (keySubscribers.size === 0) {
          subscribers.delete(key);
        }
      }
    };
  }
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Use React 18's useSyncExternalStore for better performance and consistency
  const value = useSyncExternalStore(
    (callback) => {
      // Subscribe to both localStorage changes and our custom notifications
      const unsubscribe = storageManager.subscribe(key, callback);
      
      // Also listen to storage events from other tabs
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key) {
          callback();
        }
      };
      
      window.addEventListener("storage", handleStorageChange);
      
      return () => {
        unsubscribe();
        window.removeEventListener("storage", handleStorageChange);
      };
    },
    () => storageManager.getItem<T>(key) ?? initialValue,
    () => storageManager.getItem<T>(key) ?? initialValue
  );
  
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      storageManager.setItem(key, valueToStore);
    },
    [key, value]
  );
  
  return [value, setValue];
}
