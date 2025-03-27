import { gameState, resetGame } from './game.js';
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
            case 'w':
            case 'W':
                keys.forward = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                keys.backward = true;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
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
            case 'r':
            case 'R':
                resetGame();
                break;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                keys.forward = false;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                keys.backward = false;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
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