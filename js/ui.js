import { PLAYER_MAX_HEALTH } from './game.js';
import { WEAPONS } from './entities/weapons.js';

// Opdater health bar
export function updateHealthBar(player) {
    const healthPercent = (player.userData.health / PLAYER_MAX_HEALTH) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';
    
    // Skift farve baseret på helbred
    let color = '#0f0';
    if (healthPercent < 25) {
        color = '#f00';
    } else if (healthPercent < 50) {
        color = '#ff0';
    }
    document.getElementById('health-fill').style.backgroundColor = color;
}

// Opdater ammunition display
export function updateAmmoDisplay(player) {
    const weaponType = player.userData.currentWeapon;
    const weapon = WEAPONS[weaponType];
    
    document.getElementById('ammo-count').textContent = player.userData.ammo;
    document.getElementById('ammo-capacity').textContent = weapon.ammoCapacity;
}

// Opdater boost bar
export function updateBoostBar(player) {
    const boostPercent = (player.userData.boost / 100) * 100;
    document.getElementById('boost-fill').style.width = boostPercent + '%';
}

// Opdater fjende-tæller
export function updateEnemyCount(enemyTanks) {
    let aliveCount = 0;
    enemyTanks.forEach(tank => {
        if (tank.userData.health > 0) {
            aliveCount++;
        }
    });
    document.getElementById('enemy-count').textContent = aliveCount;
    return aliveCount;
}