import { THREE, scene } from '../scene.js';

// Obstruction typer
export const OBSTACLE_TYPES = {
    WALL: 'wall',
    TREE: 'tree',
    ROCK: 'rock',
    WATER: 'water',
    BOUNDARY: 'boundary'
};

// Antallet af bygninger at generere
export const BUILDING_COUNT = 4;

// Liste over alle forhindringer
export let obstacles = [];

// Opret en mur med anden farve (til grænser)
function createBoundaryWall(x, y, z, width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x555555,  // Mørkere grå farve til grænser
        roughness: 0.8 
    });
    
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y + height/2, z);
    
    // Gem værdier for hurtigere kollisionsberegning
    const collisionData = {
        minX: x - width/2,
        maxX: x + width/2,
        minZ: z - depth/2,
        maxZ: z + depth/2
    };
    
    wall.userData = {
        type: OBSTACLE_TYPES.BOUNDARY,
        solid: true,
        destructible: false,
        collision: collisionData
    };
    
    scene.add(wall);
    obstacles.push(wall);
    
    return wall;
}

// Opret et træ
function createTree(x, z) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    
    // Træstamme
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.6, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    tree.add(trunk);
    
    // Træets krone
    const leavesGeometry = new THREE.ConeGeometry(2.5, 5, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228B22,
        roughness: 0.8 
    });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 5;
    tree.add(leaves);
    
    tree.userData = {
        type: OBSTACLE_TYPES.TREE,
        solid: true,
        destructible: true,
        health: 50,
        radius: 1.5,
        x: x,
        z: z
    };
    
    scene.add(tree);
    obstacles.push(tree);
    
    return tree;
}

// Opret en sten
function createRock(x, z, size = 1) {
    const rockGeometry = new THREE.DodecahedronGeometry(size, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 1.0 
    });
    
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, size/2, z);
    
    // Tilfældig rotation
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.rotation.z = Math.random() * 0.3;
    
    rock.userData = {
        type: OBSTACLE_TYPES.ROCK,
        solid: true,
        destructible: false,
        radius: size,
        x: x,
        z: z
    };
    
    scene.add(rock);
    obstacles.push(rock);
    
    return rock;
}

// Opret et vandområde
function createWater(x, z, width, depth) {
    const waterGeometry = new THREE.PlaneGeometry(width, depth);
    const waterMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4682B4,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1
    });
    
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.01, z); // Lidt over jorden
    
    // Gem værdier for hurtigere kollisionsberegning
    const collisionData = {
        minX: x - width/2,
        maxX: x + width/2,
        minZ: z - depth/2,
        maxZ: z + depth/2
    };
    
    water.userData = {
        type: OBSTACLE_TYPES.WATER,
        solid: true,
        destructible: false,
        collision: collisionData
    };
    
    scene.add(water);
    obstacles.push(water);
    
    return water;
}

// Opret en bygning
function createBuilding(x, y, z, width, height, depth, color = 0x8B4513) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7 
    });
    
    const building = new THREE.Mesh(geometry, material);
    building.position.set(x, y + height/2, z);
    
    // Gem værdier for hurtigere kollisionsberegning
    const collisionData = {
        minX: x - width/2,
        maxX: x + width/2,
        minZ: z - depth/2,
        maxZ: z + depth/2
    };
    
    building.userData = {
        type: OBSTACLE_TYPES.WALL,
        solid: true,
        destructible: false,
        collision: collisionData,
        isBuilding: true,  // Markør til identifikation
        width: width,
        depth: depth
    };
    
    scene.add(building);
    obstacles.push(building);
    
    return building;
}

// Generér tilfældige bygninger
function createRandomBuildings(count) {
    const buildings = [];
    const buildingMinDistance = 25; // Minimum afstand mellem bygninger
    const playerClearRadius = 20; // Hold området omkring spilleren fri
    
    const buildingColors = [
        0x8B4513, // Brun
        0x696969, // Mørkegrå
        0xA0522D, // Sienna
        0xCD853F, // Peru
        0xD2B48C  // Tan
    ];
    
    for (let i = 0; i < count; i++) {
        let validPosition = false;
        let attempts = 0;
        let x, z, width, depth, height, color;
        
        // Prøv at finde en valid position
        while (!validPosition && attempts < 30) {
            attempts++;
            
            // Generer tilfældige egenskaber
            x = (Math.random() - 0.5) * 110;
            z = (Math.random() - 0.5) * 110;
            width = 8 + Math.random() * 12; // Bredde mellem 8 og 20
            depth = 8 + Math.random() * 12; // Dybde mellem 8 og 20
            height = 4 + Math.random() * 7; // Højde mellem 4 og 11
            color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
            
            // Tjek afstand til spillerens startposition
            if (Math.sqrt(x*x + z*z) < playerClearRadius) {
                continue;
            }
            
            // Tjek overlap med andre bygninger
            let overlapWithOther = false;
            for (const building of buildings) {
                const otherX = building.position.x;
                const otherZ = building.position.z;
                const otherWidth = building.userData.width;
                const otherDepth = building.userData.depth;
                
                // Beregn afstanden mellem bygningernes midte
                const distX = Math.abs(x - otherX);
                const distZ = Math.abs(z - otherZ);
                
                // Tjek om bygningerne er for tæt på hinanden
                if (distX < (width + otherWidth) / 2 + buildingMinDistance && 
                    distZ < (depth + otherDepth) / 2 + buildingMinDistance) {
                    overlapWithOther = true;
                    break;
                }
            }
            
            if (!overlapWithOther) {
                validPosition = true;
            }
        }
        
        if (validPosition) {
            const building = createBuilding(x, 0, z, width, height, depth, color);
            buildings.push(building);
        }
    }
    
    return buildings;
}

// Opret grænsemure rundt om banen
function createBoundaryWalls() {
    const ARENA_SIZE = 195;  // Samme størrelse som jordplanet, nu 25% større
    const WALL_HEIGHT = 5;
    const WALL_THICKNESS = 2;
    
    // Nord mur (positiv z)
    createBoundaryWall(0, 0, ARENA_SIZE/2, ARENA_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS);
    
    // Syd mur (negativ z)
    createBoundaryWall(0, 0, -ARENA_SIZE/2, ARENA_SIZE + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS);
    
    // Øst mur (positiv x)
    createBoundaryWall(ARENA_SIZE/2, 0, 0, WALL_THICKNESS, WALL_HEIGHT, ARENA_SIZE);
    
    // Vest mur (negativ x)
    createBoundaryWall(-ARENA_SIZE/2, 0, 0, WALL_THICKNESS, WALL_HEIGHT, ARENA_SIZE);
}

// Opret flere forhindringer
export function createObstacles() {
    // Opret grænsemure først
    createBoundaryWalls();
    
    // Opret bygninger
    createRandomBuildings(BUILDING_COUNT);
    
    // Opret nogle træer - begrænser antallet for bedre performance
    for (let i = 0; i < 50; i++) {
        let x = (Math.random() - 0.5) * 180;
        let z = (Math.random() - 0.5) * 180;
        
        // Undgå at placere for tæt på spilleren
        if (Math.sqrt(x*x + z*z) < 15) {
            i--; // Prøv igen
            continue;
        }
        
        // Undgå at placere inde i bygninger
        let insideBuilding = false;
        for (const obstacle of obstacles) {
            if (obstacle.userData.isBuilding) {
                const building = obstacle;
                const bx = building.position.x;
                const bz = building.position.z;
                const bWidth = building.userData.width;
                const bDepth = building.userData.depth;
                
                if (x > bx - bWidth/2 - 2 && x < bx + bWidth/2 + 2 &&
                    z > bz - bDepth/2 - 2 && z < bz + bDepth/2 + 2) {
                    insideBuilding = true;
                    break;
                }
            }
        }
        
        if (insideBuilding) {
            i--; // Prøv igen
            continue;
        }
        
        createTree(x, z);
    }
    
    // Opret nogle sten - begrænser antallet for bedre performance
    for (let i = 0; i < 40; i++) {
        const x = (Math.random() - 0.5) * 175;
        const z = (Math.random() - 0.5) * 175;
        const size = 0.5 + Math.random() * 1.5; 
        
        // Undgå at placere for tæt på spilleren
        if (Math.sqrt(x*x + z*z) < 12) continue;
        
        // Undgå at placere inde i bygninger
        let insideBuilding = false;
        for (const obstacle of obstacles) {
            if (obstacle.userData && obstacle.userData.isBuilding) {
                const building = obstacle;
                const bx = building.position.x;
                const bz = building.position.z;
                const bWidth = building.userData.width;
                const bDepth = building.userData.depth;
                
                if (x > bx - bWidth/2 - 2 && x < bx + bWidth/2 + 2 &&
                    z > bz - bDepth/2 - 2 && z < bz + bDepth/2 + 2) {
                    insideBuilding = true;
                    break;
                }
            }
        }
        
        if (insideBuilding) continue;
        
        createRock(x, z, size);
    }
    
    // Opret et vandområde
    createWater(20, 20, 15, 15);
}

// Super optimeret kollisionsdetektion
export function checkObstacleCollision(position, radius = 2) {
    const x = position.x;
    const z = position.z;
    
    // Først tjek om vi er inden for banen - hurtigste check først
    if (x < -62 || x > 62 || z < -62 || z > 62) {  // Opdateret til større bane
        return true;
    }
    
    // Begræns antallet af checks
    const maxChecks = 10;
    let checksPerformed = 0;
    
    for (let i = 0; i < obstacles.length; i++) {
        if (checksPerformed >= maxChecks) break;
        
        const obstacle = obstacles[i];
        
        if (!obstacle.userData.solid) continue;
        
        // Hurtig afstandscheck først - er vi i nærheden af forhindringen?
        const dx = Math.abs(x - obstacle.position.x);
        const dz = Math.abs(z - obstacle.position.z);
        const approximateDistance = dx + dz; // Manhattan distance er hurtigere end Euclid
        
        // Skip hvis vi er langt fra forhindringen
        if (approximateDistance > 20) continue;
        
        checksPerformed++;
        
        // Forskellige kollisionstyper baseret på forhindringens form
        switch(obstacle.userData.type) {
            case OBSTACLE_TYPES.WALL:
            case OBSTACLE_TYPES.BOUNDARY:
                // Hurtig AABB kollisionsdetektering
                const collision = obstacle.userData.collision;
                if (x + radius > collision.minX && 
                    x - radius < collision.maxX && 
                    z + radius > collision.minZ && 
                    z - radius < collision.maxZ) {
                    return true;
                }
                break;
                
            case OBSTACLE_TYPES.TREE:
            case OBSTACLE_TYPES.ROCK:
                // For træer og sten, brug cirkel vs. cirkel kollisionsdetektering
                const obstacleX = obstacle.userData.x || obstacle.position.x;
                const obstacleZ = obstacle.userData.z || obstacle.position.z;
                const collisionRadius = obstacle.userData.radius || 1.5;
                
                // Brug kvadratet på afstanden (hurtigere end Math.sqrt)
                const distSquared = (x - obstacleX) * (x - obstacleX) + 
                                   (z - obstacleZ) * (z - obstacleZ);
                const radiusSum = radius + collisionRadius;
                
                if (distSquared < radiusSum * radiusSum) {
                    return true;
                }
                break;
                
            case OBSTACLE_TYPES.WATER:
                // Hurtig AABB kollisionsdetektering
                const waterCollision = obstacle.userData.collision;
                if (x + radius > waterCollision.minX && 
                    x - radius < waterCollision.maxX && 
                    z + radius > waterCollision.minZ && 
                    z - radius < waterCollision.maxZ) {
                    return true;
                }
                break;
        }
    }
    
    return false;
}

// Håndter beskadigelse af forhindringer
export function damageObstacle(obstacle, damage) {
    if (!obstacle.userData.destructible) return false;
    
    obstacle.userData.health -= damage;
    
    // Hvis forhindringen er ødelagt
    if (obstacle.userData.health <= 0) {
        // Fjern fra scenen
        scene.remove(obstacle);
        
        // Fjern fra obstacles array
        const index = obstacles.indexOf(obstacle);
        if (index > -1) {
            obstacles.splice(index, 1);
        }
        
        return true;
    }
    
    return false;
}