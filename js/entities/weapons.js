import { THREE, scene } from '../scene.js';
import { createProjectile } from './projectile.js';
import { SoundManager } from '../effects/sound.js';
import { checkObstacleCollision } from './obstacles.js';
import { updateAmmoDisplay } from '../ui.js';

// Cachede DOM-elementer
let weaponNameElement = null;
let weaponIconElement = null;

// Funktion til at sætte referencer til UI-elementer
export function setWeaponUIElements(nameElement, iconElement) {
    weaponNameElement = nameElement;
    weaponIconElement = iconElement;
}

// Våbentyper - Tilføj nye våbentyper her
export const WEAPON_TYPES = {
    STANDARD: 'standard',
    SHOTGUN: 'shotgun',
    MACHINEGUN: 'machinegun',
    ROCKETLAUNCHER: 'rocketlauncher',
    LASER: 'laser'
};

// Våbenindstillinger - Tilføj nye våbenkonfigurationer her
export const WEAPONS = {
    [WEAPON_TYPES.STANDARD]: {
        name: 'Standard Kanon',
        ammoCapacity: 5,
        reloadTime: 2000, // ms
        damage: 40,
        projectileSpeed: 40,
        spread: 0,
        projectileCount: 1,
        fireRate: 500, // Tid mellem skud i ms
        projectileSize: 0.2,
        projectileColor: 0xFFAA00,
        explosionSize: 0.7,
        fireSound: 'shoot',
        uiColor: 0x00FF00
    },
    [WEAPON_TYPES.SHOTGUN]: {
        name: 'Shotgun',
        ammoCapacity: 3,
        reloadTime: 3000, // ms
        damage: 15, // Mindre skade per projektil, men 5 projektiler
        projectileSpeed: 35,
        spread: 0.3, // Vinkel i radianer
        projectileCount: 5,
        fireRate: 800,
        projectileSize: 0.15,
        projectileColor: 0xFF6600,
        explosionSize: 0.5,
        fireSound: 'shotgun',
        uiColor: 0xFF3300
    },
    [WEAPON_TYPES.MACHINEGUN]: {
        name: 'Maskingevær',
        ammoCapacity: 20,
        reloadTime: 3500,
        damage: 10,
        projectileSpeed: 50,
        spread: 0.1,
        projectileCount: 1,
        fireRate: 100, // Hurtig skudhastighed
        projectileSize: 0.15,
        projectileColor: 0xCCCCCC,
        explosionSize: 0.4,
        fireSound: 'machinegun',
        uiColor: 0x999999
    },
    [WEAPON_TYPES.ROCKETLAUNCHER]: {
        name: 'Raketkaster',
        ammoCapacity: 2,
        reloadTime: 5000,
        damage: 80,
        projectileSpeed: 25,
        spread: 0,
        projectileCount: 1,
        fireRate: 1000,
        projectileSize: 0.3,
        projectileColor: 0xFF0000,
        explosionSize: 2.5,
        fireSound: 'rocket',
        uiColor: 0xCC0000
    },
    [WEAPON_TYPES.LASER]: {
        name: 'Laser',
        ammoCapacity: 10,
        reloadTime: 2000,
        damage: 25,
        projectileSpeed: 80, // Meget hurtigt
        spread: 0,
        projectileCount: 1,
        fireRate: 300,
        projectileSize: 0.1,
        projectileColor: 0x00FFFF,
        explosionSize: 0.5,
        fireSound: 'laser',
        uiColor: 0x00FFFF
    }
};

// Gemme alle våben-pickups
export let weaponPickups = [];

// Funktion til at affyre våben
export function fireWeapon(tank, weaponType = WEAPON_TYPES.STANDARD) {
    if (!tank || tank.userData.ammo <= 0) return false;
    
    const weapon = WEAPONS[weaponType] || WEAPONS[WEAPON_TYPES.STANDARD];
    
    const turret = tank.userData.turret;
    const cannon = tank.userData.cannon;
    
    // Find kanonens retning i verdenskoordinater
    const cannonDirection = new THREE.Vector3(0, 0, 1);
    cannonDirection.applyQuaternion(turret.getWorldQuaternion(new THREE.Quaternion()));
    
    // Find kanonens position i verden
    const cannonPosition = new THREE.Vector3();
    cannon.getWorldPosition(cannonPosition);
    
    // Affyr projektiler baseret på våbenkonfiguration
    for (let i = 0; i < weapon.projectileCount; i++) {
        // Beregn spredning for dette projektil
        let projectileDirection = cannonDirection.clone();
        
        if (weapon.spread > 0 && weapon.projectileCount > 1) {
            // Opret cone-mønster for flere projektiler
            const spreadAngle = weapon.spread; // Total vinkel af conen
            
            // Beregn vinkel for dette projektil i conen
            let angle;
            if (weapon.projectileCount === 1) {
                angle = 0;
            } else {
                // Fordel jævnt mellem -spreadAngle/2 og +spreadAngle/2
                angle = -spreadAngle/2 + (spreadAngle * i / (weapon.projectileCount - 1));
            }
            
            // Brug en opret vektor som reference for at få en horisontal spredning
            const upVector = new THREE.Vector3(0, 1, 0);
            
            // For at få horisontal spredning, roterer vi omkring en lodret akse (y-aksen)
            const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(upVector, angle);
            
            // Anvend rotationen for at få projektilretningen
            projectileDirection.applyQuaternion(rotationQuaternion);
        }
        
        // Skab projektil med våben-specifikke egenskaber
        createProjectile(
            cannonPosition, 
            projectileDirection, 
            tank,
            weapon.damage,
            weapon.projectileSpeed,
            weapon.projectileSize,
            weapon.projectileColor,
            weapon.explosionSize
        );
    }
    
    // Afspil lydeffekt
    if (tank.userData.soundController) {
        tank.userData.soundController.playWeaponSound(weaponType);
    } else {
        SoundManager.play(weapon.fireSound, { volume: 0.5 });
    }
    
    // Reducer ammunition
    tank.userData.ammo--;
    
    return true;
}

// Opret våben-pickup objekt
export function createWeaponPickup(x, y, z, weaponType) {
    const weapon = WEAPONS[weaponType];
    if (!weapon) return null;
    
    // Opret en pickup-gruppe
    const pickup = new THREE.Group();
    pickup.position.set(x, y, z);
    
    // Opret basen
    const baseGeometry = new THREE.CylinderGeometry(1, 1, 0.3, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    pickup.add(base);
    
    // Opret våbenikonet
    const iconGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.5);
    const iconMaterial = new THREE.MeshStandardMaterial({ color: weapon.uiColor });
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    icon.position.y = 0.7;
    pickup.add(icon);
    
    // Tilføj en roterende animation
    pickup.userData = {
        type: 'weaponPickup',
        weaponType: weaponType,
        rotationSpeed: 0.01,
        hoverHeight: 0.5,
        initialY: y,
        update: function(delta) {
            // Rotér pickup
            pickup.rotation.y += this.rotationSpeed;
            
            // Svæveeffekt
            const hoverOffset = Math.sin(Date.now() * 0.002) * this.hoverHeight;
            pickup.position.y = this.initialY + hoverOffset;
        }
    };
    
    scene.add(pickup);
    return pickup;
}

// Check for våben-pickups
export function checkWeaponPickups() {
    if (!window.playerTank) return;
    
    for (let i = weaponPickups.length - 1; i >= 0; i--) {
        const pickup = weaponPickups[i];
        
        // Check afstand til spiller
        const distance = pickup.position.distanceTo(window.playerTank.position);
        if (distance < 3) { // Pickup radius
            // Skift våben
            switchWeapon(pickup.userData.weaponType);
            
            // Fjern pickup
            scene.remove(pickup);
            weaponPickups.splice(i, 1);
            
            // Afspil pickup-lyd
            SoundManager.play('powerup', { volume: 0.5 });
        }
    }
}

// Opdater alle pickups (til animationer)
export function updatePickups(delta) {
    weaponPickups.forEach(pickup => {
        if (pickup.userData.update) {
            pickup.userData.update(delta);
        }
    });
}

// Skift våben for spilleren
export function switchWeapon(weaponType) {
    if (!window.playerTank) return;
    if (!WEAPONS[weaponType]) return;
    
    // Sæt nyt våben
    window.playerTank.userData.currentWeapon = weaponType;
    window.playerTank.userData.ammo = WEAPONS[weaponType].ammoCapacity;
    window.playerTank.userData.fireRate = WEAPONS[weaponType].fireRate;
    window.playerTank.userData.lastFired = 0; // Reset lastFired timer
    
    // Opdater UI
    updateAmmoDisplay(window.playerTank);
    updateWeaponDisplay(window.playerTank);
    
    // Afspil våben-skift-lyd
    SoundManager.play('weaponSwitch', { volume: 0.3 });
}

// Opdater våben-display
export function updateWeaponDisplay(player) {
    const weaponType = player.userData.currentWeapon;
    const weapon = WEAPONS[weaponType];
    
    // Brug cachede elementer hvis tilgængelige
    if (weaponNameElement) {
        weaponNameElement.textContent = weapon.name;
    } else {
        document.getElementById('weapon-name').textContent = weapon.name;
    }
    
    if (weaponIconElement) {
        weaponIconElement.style.backgroundColor = '#' + weapon.uiColor.toString(16).padStart(6, '0');
    } else {
        document.getElementById('weapon-icon').style.backgroundColor = '#' + weapon.uiColor.toString(16).padStart(6, '0');
    }
}

// Spawn våben-pickup på tilfældig position
export function spawnWeaponPickup() {
    // Vælg en tilfældig våbentype (undtagen standard)
    const weaponTypes = Object.values(WEAPON_TYPES).filter(type => type !== WEAPON_TYPES.STANDARD);
    const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
    
    // Find en gyldig position
    let x, z;
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 20) {
        attempts++;
        x = (Math.random() - 0.5) * 175;
        z = (Math.random() - 0.5) * 175;
        
        // Undgå at spawne for tæt på spilleren
        if (window.playerTank && Math.sqrt(x*x + z*z) < 15) continue;
        
        // Check kollision med forhindringer
        if (checkObstacleCollision({x, y: 0, z}, 2)) continue;
        
        // Hvis vi når hertil, er positionen gyldig
        validPosition = true;
    }
    
    if (validPosition) {
        const pickup = createWeaponPickup(x, 1, z, randomType);
        weaponPickups.push(pickup);
    }
    
    // Planlæg næste pickup spawn
    const nextSpawnTime = 20000 + Math.random() * 30000; // Mellem 20-50 sekunder
    setTimeout(spawnWeaponPickup, nextSpawnTime);
}