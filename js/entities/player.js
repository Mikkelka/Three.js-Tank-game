import { THREE, camera } from '../scene.js';
import { createTank } from './tank.js';
import { createProjectile } from './projectile.js';
import { keys } from '../input.js';
import { updateHealthBar, updateAmmoDisplay, updateBoostBar } from '../ui.js';
import { PLAYER_MAX_HEALTH } from '../game.js';
import { checkObstacleCollision } from './obstacles.js';
import { updatePlayerSounds, handleWeaponFire } from '../effects/integration.js';
import { SoundManager } from '../effects/sound.js';
import { WEAPON_TYPES, WEAPONS, fireWeapon, updateWeaponDisplay } from './weapons.js';

// Opret spillertank
export function createPlayer() {
    const player = createTank(0, 0, 0, 0x2E8B57);
    player.userData.health = PLAYER_MAX_HEALTH;
    player.userData.ammo = 5;
    player.userData.boost = 100;
    player.userData.isPlayer = true;
    player.userData.currentWeapon = WEAPON_TYPES.STANDARD; // Tilføj nuværende våben
    
    return player;
}

// Initialiser spiller UI
export function initPlayerUI(player) {
    updateHealthBar(player);
    updateAmmoDisplay(player);
    updateBoostBar(player);
    updateWeaponDisplay(player);
}

// Opdater spillerbevægelse og kontrol
export function updatePlayer(delta) {
    if (!window.playerTank || window.playerTank.userData.health <= 0) return;
    
    // Bevægelseshastighed
    let speedMultiplier = 1;
    if (keys.boost && window.playerTank.userData.boost > 0) {
        speedMultiplier = 2;
        window.playerTank.userData.boost -= 0.5;
        updateBoostBar(window.playerTank);
    } else if (window.playerTank.userData.boost < 100) {
        window.playerTank.userData.boost = Math.min(100, window.playerTank.userData.boost + 0.2);
        updateBoostBar(window.playerTank);
    }
    
    const moveSpeed = 10 * speedMultiplier * delta;
    const rotSpeed = 2 * delta;
    
    // Rotation
    if (keys.left) {
        window.playerTank.userData.rotation += rotSpeed;
        window.playerTank.rotation.y = window.playerTank.userData.rotation;
    }
    if (keys.right) {
        window.playerTank.userData.rotation -= rotSpeed;
        window.playerTank.rotation.y = window.playerTank.userData.rotation;
    }
    
    // Frem/tilbage
    if (keys.forward || keys.backward) {
        const direction = new THREE.Vector3(0, 0, keys.forward ? 1 : -1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), window.playerTank.userData.rotation);
        
        // Beregn ny position
        const newPosition = window.playerTank.position.clone();
        newPosition.x += direction.x * moveSpeed;
        newPosition.z += direction.z * moveSpeed;
        
        // Check kollision med forhindringer
        if (!checkObstacleCollision(newPosition, 2)) {
            // Kun opdater position hvis der ikke er kollision
            window.playerTank.position.copy(newPosition);
        }
    }
    
    // Opdater kamera position
    const cameraOffset = new THREE.Vector3(0, 20, -20);
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), window.playerTank.userData.rotation);
    camera.position.copy(window.playerTank.position).add(cameraOffset);
    camera.lookAt(window.playerTank.position);
    
    // Opdater lyde baseret på inputs
    updatePlayerSounds(window.playerTank, keys);
    
    // Drej tårnet med musen (kan tilføjes senere)
}

// Affyr spillerens våben
export function firePlayerWeapon() {
    if (!window.playerTank) return;
    
    const weaponType = window.playerTank.userData.currentWeapon;
    const success = fireWeapon(window.playerTank, weaponType);
    
    if (success) {
        // Opdater UI
        updateAmmoDisplay(window.playerTank);
        
        // Genopfyld efter delay
        if (window.playerTank.userData.ammo <= 0) {
            const weapon = WEAPONS[weaponType];
            setTimeout(() => {
                if (window.playerTank) {
                    window.playerTank.userData.ammo = weapon.ammoCapacity;
                    updateAmmoDisplay(window.playerTank);
                    
                    // Afspil genopfyldnings-lyd
                    SoundManager.play('reload', { volume: 0.3 });
                }
            }, weapon.reloadTime);
        }
    }
}