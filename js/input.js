import { gameState } from './game.js';
import { firePlayerWeapon } from './entities/player.js';

// Input-tilstand
export const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    fire: false,
    boost: false
};

// Opsæt event listeners
export function setupEventListeners() {
    document.addEventListener('keydown', (event) => {
        if (gameState !== 'playing') return;
        
        switch (event.key) {
            case 'ArrowUp':
                keys.forward = true;
                break;
            case 'ArrowDown':
                keys.backward = true;
                break;
            case 'ArrowLeft':
                keys.left = true;
                break;
            case 'ArrowRight':
                keys.right = true;
                break;
            case ' ':
                if (!keys.fire) {
                    keys.fire = true;
                    firePlayerWeapon();
                }
                break;
            case 'Shift':
                keys.boost = true;
                break;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        switch (event.key) {
            case 'ArrowUp':
                keys.forward = false;
                break;
            case 'ArrowDown':
                keys.backward = false;
                break;
            case 'ArrowLeft':
                keys.left = false;
                break;
            case 'ArrowRight':
                keys.right = false;
                break;
            case ' ':
                keys.fire = false;
                break;
            case 'Shift':
                keys.boost = false;
                break;
        }
    });
}