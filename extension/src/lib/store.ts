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
 */
export function addMaterials(newMaterials: Array<{ materialId: string; name: string; rarity: string; quantity: number }>): void {
  materials.update(current => {
    const updated = [...current];

    for (const newMat of newMaterials) {
      const existing = updated.find(m => m.materialId === newMat.materialId);
      if (existing) {
        existing.quantity += newMat.quantity;
      } else {
        updated.push({
          materialId: newMat.materialId,
          name: newMat.name,
          rarity: newMat.rarity as any,
          quantity: newMat.quantity,
        });
      }
    }

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
