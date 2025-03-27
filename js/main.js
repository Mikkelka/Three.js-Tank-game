import { initGame, startGame } from './game.js';
import { setupEventListeners } from './input.js';

// Initialiser spillet når vinduet er indlæst
window.onload = () => {
    initGame();
    setupEventListeners();
    
    // Sæt start-knappen op
    document.getElementById('start-button').addEventListener('click', startGame);
};