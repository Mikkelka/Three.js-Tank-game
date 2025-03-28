import { THREE } from '../scene.js';
import { createTank } from './tank.js';
import { createProjectile } from './projectile.js';
import { ENEMY_COUNT } from '../game.js';
import { updateEnemyCount } from '../ui.js';
import { checkObstacleCollision, obstacles } from './obstacles.js';

// Genbrugelige vektorer
const tempVec3 = new THREE.Vector3();
const tempTargetDir = new THREE.Vector3();
const tempMoveDir = new THREE.Vector3(0, 0, 1);
const tempUpVector = new THREE.Vector3(0, 1, 0);
const tempRotQuat = new THREE.Quaternion();
const tempAwayPos = new THREE.Vector3();
const tempNewPosition = new THREE.Vector3();

// Fjende-tilstande
const ENEMY_STATES = {
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    RETREAT: 'retreat',
    TAKE_COVER: 'take_cover'
};

// Opret fjendtlige tanks
export function createEnemies() {
    const enemies = [];
    for (let i = 0; i < ENEMY_COUNT; i++) {
        let x, z;
        let validPosition = false;
        let attempts = 0;
        
        // Undgå at spawne inden i forhindringer (med maks forsøg)
        while (!validPosition && attempts < 20) {
            attempts++;
            x = (Math.random() - 0.5) * 175;  // Opdateret til større bane
            z = (Math.random() - 0.5) * 175;  // Opdateret til større bane
            
            // Undgå at spawne for tæt på spilleren
            if (Math.sqrt(x*x + z*z) < 15) continue;
            
            // Simpel check - overlapper med andre fjender?
            let tooCloseToOtherEnemies = false;
            for (let j = 0; j < enemies.length; j++) {
                const dist = Math.sqrt(
                    Math.pow(x - enemies[j].position.x, 2) + 
                    Math.pow(z - enemies[j].position.z, 2)
                );
                if (dist < 10) {
                    tooCloseToOtherEnemies = true;
                    break;
                }
            }
            if (tooCloseToOtherEnemies) continue;
            
            // Undgå at spawne inden i bygninger
            let insideBuilding = false;
            for (const obstacle of obstacles) {
                if (obstacle.userData && obstacle.userData.isBuilding) {
                    const building = obstacle;
                    const bx = building.position.x;
                    const bz = building.position.z;
                    const bWidth = building.userData.width;
                    const bDepth = building.userData.depth;
                    
                    if (x > bx - bWidth/2 - 3 && x < bx + bWidth/2 + 3 &&
                        z > bz - bDepth/2 - 3 && z < bz + bDepth/2 + 3) {
                        insideBuilding = true;
                        break;
                    }
                }
            }
            if (insideBuilding) continue;
            
            // Hvis vi når hertil, er positionen gyldig
            validPosition = true;
        }
        
        const enemy = createTank(x, 0, z, 0x8B0000);
        enemy.userData.health = 80;
        enemy.userData.type = 'enemy';
        enemy.userData.direction = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        enemy.userData.lastFired = 0;
        enemy.userData.fireDelay = 3000 + Math.random() * 2000;
        enemy.userData.state = ENEMY_STATES.PATROL;
        enemy.userData.targetPosition = null;
        enemy.userData.patrolPoints = generateSimplePatrolPoints(x, z);
        enemy.userData.currentPatrolIndex = 0;
        enemy.userData.stuckTime = 0;
        enemy.userData.prevPosition = new THREE.Vector3(x, 0, z);
        enemy.userData.coverPosition = null;
        enemy.userData.lastStateChange = Date.now();
        enemy.userData.accuracy = 0.8 + Math.random() * 0.15; // Varierende præcision
        
        enemies.push(enemy);
    }
    
    return enemies;
}

// Generer enkle patruljepunkter uden kollisionscheck
function generateSimplePatrolPoints(startX, startZ) {
    const points = [];
    const numPoints = 3 + Math.floor(Math.random() * 3); // 3-5 punkter
    const radius = 15;
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const distVariation = 0.5 + Math.random() * 0.5;
        const dist = radius * distVariation;
        
        const x = startX + Math.cos(angle) * dist;
        const z = startZ + Math.sin(angle) * dist;
        
        // Sørg for at punktet er inden for banens grænser
        const boundedX = Math.max(-45, Math.min(45, x));
        const boundedZ = Math.max(-45, Math.min(45, z));
        
        points.push(new THREE.Vector3(boundedX, 0, boundedZ));
    }
    
    return points;
}

// Find nærmeste dækning
function findCoverPosition(enemy, targetPosition) {
    // Forenklet version uden tunge beregninger
    const searchAngles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
    const searchDistance = 15;
    
    // Find retning væk fra spilleren - GENBRUG VEKTOR
    tempVec3.subVectors(enemy.position, targetPosition).normalize();
    
    // Prøv denne retning først (væk fra spilleren) - GENBRUG VEKTOR
    tempAwayPos.copy(enemy.position).addScaledVector(tempVec3, searchDistance);
    
    // Sørg for at positionen er inden for banens grænser
    tempAwayPos.x = Math.max(-45, Math.min(45, tempAwayPos.x));
    tempAwayPos.z = Math.max(-45, Math.min(45, tempAwayPos.z));
    
    return tempAwayPos.clone(); // Vi returnerer stadig en kopi
}

// Opdater fjender
export function updateEnemies(delta) {
    if (!window.enemyTanks || !window.playerTank) return;
    
    window.enemyTanks.forEach(enemy => {
        if (enemy.userData.health <= 0) return;
        
        // Find afstand til spiller
        const distToPlayer = enemy.position.distanceTo(window.playerTank.position);
        const playerAlive = window.playerTank.userData.health > 0;
        const now = Date.now();
        
        // Check om fjenden er fastklemt
        const moveDistance = enemy.position.distanceTo(enemy.userData.prevPosition);
        if (moveDistance < 0.1 * delta) {
            enemy.userData.stuckTime += delta;
        } else {
            enemy.userData.stuckTime = 0;
        }
        
        // Gem nuværende position til næste frame
        enemy.userData.prevPosition.copy(enemy.position);
        
        // Tilstands-tidsbaseret ændring
        const timeSinceStateChange = now - enemy.userData.lastStateChange;
        
        // Flytnings- og rotationshastigehd
        const moveSpeed = 5 * delta;
        const rotSpeed = 1 * delta;
        
        // Opdater tilstand baseret på forhold
        if (playerAlive) {
            // Skift tilstand baseret på situationen
            if (enemy.userData.state === ENEMY_STATES.PATROL && distToPlayer < 30) {
                enemy.userData.state = ENEMY_STATES.CHASE;
                enemy.userData.lastStateChange = now;
            } 
            else if (enemy.userData.state === ENEMY_STATES.CHASE && distToPlayer < 20) {
                enemy.userData.state = ENEMY_STATES.ATTACK;
                enemy.userData.lastStateChange = now;
            }
            else if (enemy.userData.state === ENEMY_STATES.ATTACK && enemy.userData.health < 30) {
                enemy.userData.state = ENEMY_STATES.RETREAT;
                enemy.userData.lastStateChange = now;
                
                // Find et dækningspunkt
                enemy.userData.coverPosition = findCoverPosition(enemy, window.playerTank.position);
            }
            else if (enemy.userData.state === ENEMY_STATES.RETREAT && enemy.userData.health > 50 && timeSinceStateChange > 5000) {
                enemy.userData.state = ENEMY_STATES.CHASE;
                enemy.userData.lastStateChange = now;
            }
            
            // Hvis fjenden sidder fast, skift tilstand
            if (enemy.userData.stuckTime > 1.5) {
                if (enemy.userData.state === ENEMY_STATES.CHASE || enemy.userData.state === ENEMY_STATES.ATTACK) {
                    enemy.userData.state = ENEMY_STATES.PATROL;
                } else if (enemy.userData.state === ENEMY_STATES.PATROL) {
                    // Skift til næste patruljepunkt
                    enemy.userData.currentPatrolIndex = 
                        (enemy.userData.currentPatrolIndex + 1) % enemy.userData.patrolPoints.length;
                }
                enemy.userData.stuckTime = 0;
                enemy.userData.lastStateChange = now;
            }
        } else {
            // Hvis spilleren er død, gå tilbage til patrulje
            enemy.userData.state = ENEMY_STATES.PATROL;
        }
        
        // Håndter hver tilstand
        switch (enemy.userData.state) {
            case ENEMY_STATES.PATROL:
                handlePatrolState(enemy, moveSpeed, rotSpeed);
                break;
                
            case ENEMY_STATES.CHASE:
                handleChaseState(enemy, moveSpeed, rotSpeed);
                break;
                
            case ENEMY_STATES.ATTACK:
                handleAttackState(enemy, moveSpeed, rotSpeed);
                break;
                
            case ENEMY_STATES.RETREAT:
                handleRetreatState(enemy, moveSpeed, rotSpeed);
                break;
        }
    });
}

// Håndter patrulje-tilstand
function handlePatrolState(enemy, moveSpeed, rotSpeed) {
    const currentPoint = enemy.userData.patrolPoints[enemy.userData.currentPatrolIndex];
    const distToPoint = enemy.position.distanceTo(currentPoint);
    
    // Hvis vi er tæt nok på målet, gå til næste punkt
    if (distToPoint < 2) {
        enemy.userData.currentPatrolIndex = 
            (enemy.userData.currentPatrolIndex + 1) % enemy.userData.patrolPoints.length;
        return;
    }
    
    // Beregn retning til målet - GENBRUG VEKTOR
    tempTargetDir.subVectors(currentPoint, enemy.position).normalize();
    
    // Beregn vinkel til målet
    const targetAngle = Math.atan2(tempTargetDir.x, tempTargetDir.z);
    
    // Roter mod målet
    rotateTowards(enemy, targetAngle, rotSpeed);
    
    // Bevæg fremad mod målet
    moveForward(enemy, moveSpeed);
}

// Håndter jagt-tilstand
function handleChaseState(enemy, moveSpeed, rotSpeed) {
    // Beregn retning til spilleren - GENBRUG VEKTOR
    tempTargetDir.subVectors(window.playerTank.position, enemy.position).normalize();
    
    // Beregn vinkel til spilleren
    const targetAngle = Math.atan2(tempTargetDir.x, tempTargetDir.z);
    
    // Roter mod spilleren
    rotateTowards(enemy, targetAngle, rotSpeed);
    
    // Bevæg fremad mod spilleren
    moveForward(enemy, moveSpeed);
}

// Håndter angreb-tilstand
function handleAttackState(enemy, moveSpeed, rotSpeed) {
    const now = Date.now();
    const distToPlayer = enemy.position.distanceTo(window.playerTank.position);
    
    // Beregn retning til spilleren - GENBRUG VEKTOR
    tempTargetDir.subVectors(window.playerTank.position, enemy.position).normalize();
    
    // Beregn vinkel til spilleren
    const targetAngle = Math.atan2(tempTargetDir.x, tempTargetDir.z);
    
    // Ret tårnet mod spilleren
    enemy.userData.turret.rotation.y = targetAngle - enemy.rotation.y;
    
    // Hold god afstand - ikke for tæt på, ikke for langt væk
    if (distToPlayer < 12) {
        // Træk sig lidt tilbage - GENBRUG VEKTOR
        tempVec3.subVectors(enemy.position, window.playerTank.position).normalize();
        
        tempNewPosition.copy(enemy.position);
        tempNewPosition.x += tempVec3.x * moveSpeed;
        tempNewPosition.z += tempVec3.z * moveSpeed;
        
        // Check kollision
        if (!checkObstacleCollision(tempNewPosition, 2)) {
            enemy.position.copy(tempNewPosition);
        } else {
            // Hvis blokeret, forsøg at rotere lidt
            enemy.userData.rotation += rotSpeed;
            enemy.rotation.y = enemy.userData.rotation;
        }
    } else if (distToPlayer > 17) {
        // Bevæg sig tættere på
        rotateTowards(enemy, targetAngle, rotSpeed);
        moveForward(enemy, moveSpeed);
    } else {
        // Perfekt afstand - roter til en god skudvinkel men bevæg dig ikke
        rotateTowards(enemy, targetAngle, rotSpeed * 2);
    }
    
    // Skyd hvis tårnet er rettet mod spilleren
    const turretAngle = enemy.userData.turret.rotation.y + enemy.rotation.y;
    const angleDiff = Math.abs(normalizeAngle(turretAngle - targetAngle));
    
    if (angleDiff < 0.2 && Date.now() - enemy.userData.lastFired > enemy.userData.fireDelay) {
        // Find kanonens retning i verdenskoordinater
        const turret = enemy.userData.turret;
        const cannon = enemy.userData.cannon;
        
        // Tilføj lidt tilfældig spredning baseret på fjendens præcision
        const accuracy = enemy.userData.accuracy;
        const maxSpread = (1 - accuracy) * 0.2;
        const randomSpread = (Math.random() * maxSpread * 2) - maxSpread;
        
        const cannonDirection = new THREE.Vector3(0, 0, 1);
        cannonDirection.applyQuaternion(turret.getWorldQuaternion(new THREE.Quaternion()));
        
        // Tilfør spredning
        cannonDirection.x += randomSpread;
        cannonDirection.y += randomSpread * 0.1;
        cannonDirection.normalize(); // Normalisér efter at have tilføjet spredning
        
        // Find kanonens position i verden
        const cannonPosition = new THREE.Vector3();
        cannon.getWorldPosition(cannonPosition);
        
        // Skab projektil
        createProjectile(cannonPosition, cannonDirection, enemy);
        
        enemy.userData.lastFired = Date.now();
    }
}

// Håndter tilbagetrækning-tilstand
function handleRetreatState(enemy, moveSpeed, rotSpeed) {
    // Hvis vi har et dækningspunkt
    if (enemy.userData.coverPosition) {
        const distToCover = enemy.position.distanceTo(enemy.userData.coverPosition);
        
        if (distToCover < 2) {
            // Vi har nået dækning - gå over til at skyde fra dækning
            if (Date.now() - enemy.userData.lastStateChange > 5000) {
                enemy.userData.state = ENEMY_STATES.ATTACK;
                enemy.userData.lastStateChange = Date.now();
            }
            return;
        }
        
        // Bevæg mod dækning - GENBRUG VEKTOR
        tempTargetDir.subVectors(enemy.userData.coverPosition, enemy.position).normalize();
        
        // Beregn vinkel til målet
        const targetAngle = Math.atan2(tempTargetDir.x, tempTargetDir.z);
        
        // Roter mod dækning
        rotateTowards(enemy, targetAngle, rotSpeed * 1.5);
        
        // Bevæg fremad hurtigere (flygt)
        moveForward(enemy, moveSpeed * 1.5);
    } else {
        // Intet dækningspunkt - bare bevæg væk fra spilleren - GENBRUG VEKTOR
        tempVec3.subVectors(enemy.position, window.playerTank.position).normalize();
        
        // Beregn vinkel væk fra spilleren
        const awayAngle = Math.atan2(tempVec3.x, tempVec3.z);
        
        // Roter væk
        rotateTowards(enemy, awayAngle, rotSpeed * 1.5);
        
        // Bevæg fremad hurtigt
        moveForward(enemy, moveSpeed * 1.5);
    }
}

// Hjælpefunktion til at rotere mod en vinkel
function rotateTowards(enemy, targetAngle, rotSpeed) {
    const currentAngle = enemy.userData.rotation;
    
    // Find den korteste vej at rotere
    let deltaAngle = normalizeAngle(targetAngle - currentAngle);
    
    // Smooth rotation
    if (Math.abs(deltaAngle) > 0.1) {
        enemy.userData.rotation += Math.sign(deltaAngle) * Math.min(Math.abs(deltaAngle), rotSpeed);
        enemy.rotation.y = enemy.userData.rotation;
    }
}

// Hjælpefunktion til at bevæge fremad
function moveForward(enemy, moveSpeed) {
    tempMoveDir.set(0, 0, 1); // Reset moveDir
    tempMoveDir.applyAxisAngle(tempUpVector, enemy.userData.rotation);
    
    tempNewPosition.copy(enemy.position);
    tempNewPosition.x += tempMoveDir.x * moveSpeed;
    tempNewPosition.z += tempMoveDir.z * moveSpeed;
    
    // Check kollision
    if (!checkObstacleCollision(tempNewPosition, 2)) {
        enemy.position.copy(tempNewPosition);
    }
}

// Hjælpefunktion til at normalisere vinkler til intervallet [-PI, PI]
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}