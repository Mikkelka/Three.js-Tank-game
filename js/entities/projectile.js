import { THREE, scene } from '../scene.js';
import { updateHealthBar, updateEnemyCount } from '../ui.js';
import { obstacles, damageObstacle } from './obstacles.js';
import { handleProjectileImpact } from '../effects/integration.js';

// Projektiler array til at holde styr på alle projektiler
export let projectiles = [];

// Opret projektil
export function createProjectile(position, direction, shooter, damage = 40, speed = 40, size = 0.2, color = 0xFFAA00, explosionSize = 0.7) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5
    });
    
    const projectile = new THREE.Mesh(geometry, material);
    projectile.position.copy(position);
    scene.add(projectile);
    
    projectile.userData = {
        direction: direction.clone().normalize(),
        speed: speed,
        shooter: shooter,
        damage: damage,
        timeCreated: Date.now(),
        explosionSize: explosionSize
    };
    
    projectiles.push(projectile);
    return projectile;
}

// Opdater projektiler
export function updateProjectiles(delta) {
    if (!window.playerTank || !window.enemyTanks) return;
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        // Bevæg projektil
        const speed = projectile.userData.speed * delta;
        projectile.position.x += projectile.userData.direction.x * speed;
        projectile.position.y += projectile.userData.direction.y * speed;
        projectile.position.z += projectile.userData.direction.z * speed;
        
        // Check levetid
        if (Date.now() - projectile.userData.timeCreated > 3000) {
            scene.remove(projectile);
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check kollision med forhindringer
        let obstacleHit = false;
        for (let j = 0; j < obstacles.length; j++) {
            const obstacle = obstacles[j];
            
            // Spring over ikke-solide forhindringer
            if (!obstacle.userData.solid) continue;
            
            // Forskellige kollisionstyper baseret på forhindringens type
            let collision = false;
            
            if (obstacle.userData.type === 'wall' || obstacle.userData.type === 'water') {
                // For mure og vand, brug bounding box
                const box = new THREE.Box3().setFromObject(obstacle);
                if (box.containsPoint(projectile.position)) {
                    collision = true;
                }
            } else {
                // For træer og sten, brug afstand
                const collisionDistance = obstacle.userData.type === 'tree' ? 1.5 : 
                                         (obstacle.userData.type === 'rock' ? obstacle.geometry.parameters.radius : 2);
                
                const distance = projectile.position.distanceTo(obstacle.position);
                if (distance < collisionDistance) {
                    collision = true;
                }
            }
            
            if (collision) {
                // Fjern projektil
                scene.remove(projectile);
                projectiles.splice(i, 1);
                
                // Forsøg at beskadige forhindringen
                const destroyed = damageObstacle(obstacle, projectile.userData.damage);
                
                // Visuelle og lyd-effekter
                handleProjectileImpact(projectile, obstacle, destroyed);
                
                obstacleHit = true;
                break;
            }
        }
        
        if (obstacleHit) continue;
        
        // Check kollision med spiller
        const shooter = projectile.userData.shooter;
        if (!shooter.userData.isPlayer && window.playerTank.userData.health > 0) {
            const distance = projectile.position.distanceTo(window.playerTank.position);
            if (distance < 2.5) {
                // Skad spilleren
                window.playerTank.userData.health -= projectile.userData.damage;
                updateHealthBar(window.playerTank);
                
                // Fjern projektil
                scene.remove(projectile);
                projectiles.splice(i, 1);
                
                // Visuelle og lyd-effekter
                handleProjectileImpact(projectile, window.playerTank, window.playerTank.userData.health <= 0);
                
                // Game over check
                if (window.playerTank.userData.health <= 0) {
                    setTimeout(() => {
                        alert("Game Over! Din tank blev ødelagt!");
                        location.reload();
                    }, 1000);  // Giv tid til at se eksplosionen
                }
                
                continue;
            }
        }
        
        // Check kollision med fjender
        for (let j = 0; j < window.enemyTanks.length; j++) {
            const enemy = window.enemyTanks[j];
            if (enemy.userData.health <= 0 || shooter === enemy) continue;
            
            const distance = projectile.position.distanceTo(enemy.position);
            if (distance < 2.5) {
                // Skad fjenden
                enemy.userData.health -= projectile.userData.damage;
                
                // Fjern projektil
                scene.remove(projectile);
                projectiles.splice(i, 1);
                
                const isDestroyed = enemy.userData.health <= 0;
                
                // Visuelle og lyd-effekter
                handleProjectileImpact(projectile, enemy, isDestroyed);
                
                // Fjern fjenden hvis den er død
                if (isDestroyed) {
                    enemy.visible = false;
                    
                    // Opdater fjende-tæller
                    const remainingEnemies = updateEnemyCount(window.enemyTanks);
                    
                    // Check sejr
                    if (remainingEnemies === 0) {
                        setTimeout(() => {
                            alert("Sejr! Du har elimineret alle fjendtlige tanks!");
                            location.reload();
                        }, 1000);  // Giv tid til at se eksplosionen
                    }
                    
                    // Score
                    window.score = (window.score || 0) + 100;
                }
                
                break;
            }
        }
    }
}