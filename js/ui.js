import { PLAYER_MAX_HEALTH } from './game.js';
import { WEAPONS, setWeaponUIElements } from './entities/weapons.js';

// Cachede DOM-elementer
let healthFillElement, 
    boostFillElement, 
    ammoCountElement, 
    ammoCapacityElement, 
    enemyCountElement,
    weaponNameElement,
    weaponIconElement;

// Initialiser og cache UI elementer
export function initUIElements() {
    // Cache alle DOM elementer
    healthFillElement = document.getElementById('health-fill');
    boostFillElement = document.getElementById('boost-fill');
    ammoCountElement = document.getElementById('ammo-count');
    ammoCapacityElement = document.getElementById('ammo-capacity');
    enemyCountElement = document.getElementById('enemy-count');
    weaponNameElement = document.getElementById('weapon-name');
    weaponIconElement = document.getElementById('weapon-icon');
    
    // Send reference til weapons.js
    setWeaponUIElements(weaponNameElement, weaponIconElement);
    
    console.log("UI elementer initialiseret og cachet");
}

// Opdater health bar
export function updateHealthBar(player) {
    const healthPercent = (player.userData.health / PLAYER_MAX_HEALTH) * 100;
    healthFillElement.style.width = healthPercent + '%';
    
    // Skift farve baseret på helbred
    let color = '#0f0';
    if (healthPercent < 25) {
        color = '#f00';
    } else if (healthPercent < 50) {
        color = '#ff0';
    }
    healthFillElement.style.backgroundColor = color;
}

// Opdater ammunition display
export function updateAmmoDisplay(player) {
    const weaponType = player.userData.currentWeapon;
    const weapon = WEAPONS[weaponType];
    
    ammoCountElement.textContent = player.userData.ammo;
    ammoCapacityElement.textContent = weapon.ammoCapacity;
}

// Opdater boost bar
export function updateBoostBar(player) {
    const boostPercent = (player.userData.boost / 100) * 100;
    boostFillElement.style.width = boostPercent + '%';
}

// Opdater fjende-tæller
export function updateEnemyCount(enemyTanks) {
    let aliveCount = 0;
    enemyTanks.forEach(tank => {
        if (tank.userData.health > 0) {
            aliveCount++;
        }
    });
    enemyCountElement.textContent = aliveCount;
    return aliveCount;
}