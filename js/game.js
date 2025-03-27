import { initScene, scene, camera, renderer } from './scene.js';
import { createPlayer, updatePlayer, initPlayerUI } from './entities/player.js';
import { createEnemies, updateEnemies } from './entities/enemy.js';
import { updateProjectiles, projectiles } from './entities/projectile.js';
import { updateEnemyCount } from './ui.js';
import { createObstacles } from './entities/obstacles.js';
import { initEffects } from './effects/integration.js';
import { SoundManager } from './effects/sound.js';
import { spawnWeaponPickup, updatePickups, checkWeaponPickups, updateWeaponDisplay } from './entities/weapons.js';

// Konstanter
export const ENEMY_COUNT = 5;
export const PLAYER_MAX_HEALTH = 100;

// Spiltilstand
export let gameState = 'start';
export let score = 0;

// Initialiser spillet
export function initGame() {
    initScene();
    
    // Opret forhindringer først så de er under andre objekter
    createObstacles();
    
    // Opret spiller og tilgængeliggør globalt
    window.playerTank = createPlayer();
    
    // Opret fjender og tilgængeliggør globalt
    window.enemyTanks = createEnemies();
    
    // Initialiser UI efter at objekterne er oprettet
    initPlayerUI(window.playerTank);
    document.getElementById('enemy-count').textContent = ENEMY_COUNT;
    
    // Initialiser effekter
    initEffects();
    
    animate(0);
}

// Start spillet
export function startGame() {
    gameState = 'playing';
    document.getElementById('start-screen').style.display = 'none';
    
    // Initialiser lydmanager (flyttet hertil så det sker ved brugerinteraktion)
    SoundManager.init();
    
    // Start motorlyde
    if (window.playerTank && window.playerTank.userData.soundController) {
        window.playerTank.userData.soundController.startEngine();
    }
    
    // Start motor for fjender
    if (window.enemyTanks) {
        window.enemyTanks.forEach(tank => {
            if (tank.userData.soundController) {
                tank.userData.soundController.startEngine();
            }
        });
    }
    
    // Start spawn af våben-pickups
    setTimeout(spawnWeaponPickup, 10000); // Første pickup efter 10 sekunder
}

// Animation loop
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    
    // Beregn delta time
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    
    // Skip hvis delta er for stor
    if (delta > 0.1) {
        renderer.render(scene, camera);
        return;
    }
    
    if (gameState === 'playing') {
        // Opdater spil
        updatePlayer(delta);
        updateEnemies(delta);
        updateProjectiles(delta);
        updatePickups(delta); // Tilføj denne linje
        checkWeaponPickups(); // Tilføj denne linje
    }
    
    // Render scene
    renderer.render(scene, camera);
}