import { THREE } from '../scene.js';
import { createTank } from './tank.js';
import { createProjectile } from './projectile.js';
import { ENEMY_COUNT } from '../game.js';
import { updateEnemyCount } from '../ui.js';
import { checkObstacleCollision } from './obstacles.js';

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
            x = (Math.random() - 0.5) * 80;
            z = (Math.random() - 0.5) * 80;
            
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
    
    // Find retning væk fra spilleren
    const dirFromPlayer = new THREE.Vector3();
    dirFromPlayer.subVectors(enemy.position, targetPosition).normalize();
    
    // Prøv denne retning først (væk fra spilleren)
    const awayPos = new THREE.Vector3();
    awayPos.copy(enemy.position).addScaledVector(dirFromPlayer, searchDistance);
    
    // Sørg for at positionen er inden for banens grænser
    awayPos.x = Math.max(-45, Math.min(45, awayPos.x));
    awayPos.z = Math.max(-45, Math.min(45, awayPos.z));
    
    return awayPos;
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
    
    // Beregn retning til målet
    const targetDir = new THREE.Vector3();
    targetDir.subVectors(currentPoint, enemy.position).normalize();
    
    // Beregn vinkel til målet
    const targetAngle = Math.atan2(targetDir.x, targetDir.z);
    
    // Roter mod målet
    rotateTowards(enemy, targetAngle, rotSpeed);
    
    // Bevæg fremad mod målet
    moveForward(enemy, moveSpeed);
}

// Håndter jagt-tilstand
function handleChaseState(enemy, moveSpeed, rotSpeed) {
    // Beregn retning til spilleren
    const targetDir = new THREE.Vector3();
    targetDir.subVectors(window.playerTank.position, enemy.position).normalize();
    
    // Beregn vinkel til spilleren
    const targetAngle = Math.atan2(targetDir.x, targetDir.z);
    
    // Roter mod spilleren
    rotateTowards(enemy, targetAngle, rotSpeed);
    
    // Bevæg fremad mod spilleren
    moveForward(enemy, moveSpeed);
}

// Håndter angreb-tilstand
function handleAttackState(enemy, moveSpeed, rotSpeed) {
    const now = Date.now();
    const distToPlayer = enemy.position.distanceTo(window.playerTank.position);
    
    // Beregn retning til spilleren
    const targetDir = new THREE.Vector3();
    targetDir.subVectors(window.playerTank.position, enemy.position).normalize();
    
    // Beregn vinkel til spilleren
    const targetAngle = Math.atan2(targetDir.x, targetDir.z);
    
    // Ret tårnet mod spilleren
    enemy.userData.turret.rotation.y = targetAngle - enemy.rotation.y;
    
    // Hold god afstand - ikke for tæt på, ikke for langt væk
    if (distToPlayer < 12) {
        // Træk sig lidt tilbage
        const retreatDir = new THREE.Vector3();
        retreatDir.subVectors(enemy.position, window.playerTank.position).normalize();
        
        const newPosition = enemy.position.clone();
        newPosition.x += retreatDir.x * moveSpeed;
        newPosition.z += retreatDir.z * moveSpeed;
        
        // Check kollision
        if (!checkObstacleCollision(newPosition, 2)) {
            enemy.position.copy(newPosition);
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
        
        // Bevæg mod dækning
        const targetDir = new THREE.Vector3();
        targetDir.subVectors(enemy.userData.coverPosition, enemy.position).normalize();
        
        // Beregn vinkel til målet
        const targetAngle = Math.atan2(targetDir.x, targetDir.z);
        
        // Roter mod dækning
        rotateTowards(enemy, targetAngle, rotSpeed * 1.5);
        
        // Bevæg fremad hurtigere (flygt)
        moveForward(enemy, moveSpeed * 1.5);
    } else {
        // Intet dækningspunkt - bare bevæg væk fra spilleren
        const awayDir = new THREE.Vector3();
        awayDir.subVectors(enemy.position, window.playerTank.position).normalize();
        
        // Beregn vinkel væk fra spilleren
        const awayAngle = Math.atan2(awayDir.x, awayDir.z);
        
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
    const moveDir = new THREE.Vector3(0, 0, 1);
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), enemy.userData.rotation);
    
    const newPosition = enemy.position.clone();
    newPosition.x += moveDir.x * moveSpeed;
    newPosition.z += moveDir.z * moveSpeed;
    
    // Check kollision
    if (!checkObstacleCollision(newPosition, 2)) {
        enemy.position.copy(newPosition);
    }
}

// Hjælpefunktion til at normalisere vinkler til intervallet [-PI, PI]
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}