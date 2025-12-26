/**
 * Svelte stores for viewer state management
 * Reactive state for currency, materials, and characters
 */

import { writable } from 'svelte/store';
import type { MaterialInventoryItem, CharacterInstance } from '@project-puff/shared';

// Viewer state
export const viewerId = writable<string>('');
export const username = writable<string>('');
export const dustBalance = writable<number>(250);

// Material inventory
export const materials = writable<MaterialInventoryItem[]>([]);

// Character collection
export const characters = writable<CharacterInstance[]>([]);

// UI state
export const isLoading = writable<boolean>(false);
export const errorMessage = writable<string | null>(null);

/**
 * Update viewer state from inventory response
 */
export function updateViewerState(data: {
  viewer: { twitchId: string; username: string; dustBalance: number };
  materials: MaterialInventoryItem[];
  characters: CharacterInstance[];
}): void {
  viewerId.set(data.viewer.twitchId);
  username.set(data.viewer.username);
  dustBalance.set(data.viewer.dustBalance);
  materials.set(data.materials);
  characters.set(data.characters);
}

/**
 * Update dust balance
 */
export function updateDustBalance(newBalance: number): void {
  dustBalance.set(newBalance);
}

/**
 * Add materials to inventory
 * Creates a new array to ensure Svelte reactivity triggers
 */
export function addMaterials(newMaterials: Array<{ materialId: string; name: string; rarity: string; quantity: number }>): void {
  materials.update(current => {
    // Create a new array with a copy of existing materials
    const updated: MaterialInventoryItem[] = current.map(m => ({
      materialId: m.materialId,
      name: m.name,
      rarity: m.rarity,
      quantity: m.quantity,
    }));

    for (const newMat of newMaterials) {
      const existingIndex = updated.findIndex(m => m.materialId === newMat.materialId);
      if (existingIndex >= 0) {
        // Create new object instead of mutating
        const existing = updated[existingIndex];
        updated[existingIndex] = {
          materialId: existing.materialId,
          name: existing.name,
          rarity: existing.rarity,
          quantity: existing.quantity + newMat.quantity,
        };
      } else {
        updated.push({
          materialId: newMat.materialId,
          name: newMat.name,
          rarity: newMat.rarity as any,
          quantity: newMat.quantity,
        });
      }
    }

    // Return new array reference to ensure reactivity
    return updated;
  });
}

/**
 * Add character to collection
 */
export function addCharacter(character: CharacterInstance): void {
  characters.update(current => [...current, character]);
}

/**
 * Set error message
 */
export function setError(message: string | null): void {
  errorMessage.set(message);
  if (message) {
    setTimeout(() => errorMessage.set(null), 5000);
  }
}
