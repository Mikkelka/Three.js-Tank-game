import { THREE, scene } from '../scene.js';

// Opret en eksplosion med simple partikler (uden at bruge billeder)
export function createExplosion(position, size = 1, duration = 1000) {
    // Opret partikelsystem til eksplosion
    const particleCount = 20;
    const particles = new THREE.Group();
    
    // Tilfældige farver for eksplosion
    const colors = [0xff9900, 0xff6600, 0xff3300, 0xffcc00, 0xff0000];
    
    for (let i = 0; i < particleCount; i++) {
        // Vælg en tilfældig farve
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Brug en lille kugle som partikel
        const geometry = new THREE.SphereGeometry(0.1, 6, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Tilfældig størrelse
        const particleSize = (0.5 + Math.random() * 0.5) * size;
        particle.scale.set(particleSize, particleSize, particleSize);
        
        // Tilfældig position inden for en sfære
        const direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();
        
        const distance = Math.random() * size * 0.5;
        particle.position.copy(position).addScaledVector(direction, distance);
        
        // Tilføj til gruppen
        particles.add(particle);
        
        // Animation data
        particle.userData = {
            direction: direction,
            speed: 0.1 + Math.random() * 0.3,
            fadeSpeed: Math.random() * 0.03 + 0.02,
            scaleSpeed: Math.random() * 0.01 + 0.005,
            initialSize: particleSize
        };
    }
    
    // Tilføj lyseffekt i centrum af eksplosionen
    const light = new THREE.PointLight(0xff9900, 2, size * 5);
    light.position.copy(position);
    particles.add(light);
    
    // Animations data til lys
    light.userData = {
        initialIntensity: light.intensity,
        fadeSpeed: 2 / (duration / 1000)  // Fade over varigheden
    };
    
    scene.add(particles);
    
    // Animation
    const startTime = Date.now();
    
    function animateExplosion() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        // Animér partikler
        particles.children.forEach(particle => {
            if (particle instanceof THREE.Mesh) {
                // Bevæg
                particle.position.addScaledVector(
                    particle.userData.direction, 
                    particle.userData.speed
                );
                
                // Fade ud
                if (particle.material.opacity > 0) {
                    particle.material.opacity -= particle.userData.fadeSpeed;
                }
                
                // Gør større undervejs
                const scale = particle.userData.initialSize * (1 + progress * 0.5);
                particle.scale.set(scale, scale, scale);
            } else if (particle instanceof THREE.PointLight) {
                // Fade lys ud
                particle.intensity = Math.max(
                    0, 
                    particle.userData.initialIntensity * (1 - progress * 1.5)
                );
            }
        });
        
        // Fortsæt animation indtil færdig
        if (elapsed < duration) {
            requestAnimationFrame(animateExplosion);
        } else {
            scene.remove(particles);
        }
    }
    
    animateExplosion();
    
    return particles;
}

// Funktion til at vise mindre skade-eksplosion på en tank
export function createDamageEffect(tank) {
    // Find tilfældig position på tanken til skade-indikation
    const tankBoundingBox = new THREE.Box3().setFromObject(tank);
    const size = new THREE.Vector3();
    tankBoundingBox.getSize(size);
    
    const position = tank.position.clone();
    position.x += (Math.random() - 0.5) * size.x * 0.8;
    position.y += size.y * 0.5;
    position.z += (Math.random() - 0.5) * size.z * 0.8;
    
    // Mindre eksplosion
    createExplosion(position, 0.5, 500);
}

// Opret vedvarende røg-effekt til beskadigede tanks
export function createSmokeEffect(tank) {
    const smokeGroup = new THREE.Group();
    tank.add(smokeGroup);
    smokeGroup.position.set(0, 1.5, 0);
    tank.userData.smokeEffect = smokeGroup;
    
    // Opret røgpartikler
    function emitSmoke() {
        if (tank.userData.health <= 0) return;
        
        // Brug en geometri i stedet for sprite
        const geometry = new THREE.SphereGeometry(0.2, 6, 6);
        const material = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.3
        });
        
        const particle = new THREE.Mesh(geometry, material);
        const size = 0.5 + Math.random() * 0.3;
        particle.scale.set(size, size, size);
        particle.userData.initialSize = size;
        
        // Tilfældig position tæt på toppen af tanken
        particle.position.set(
            (Math.random() - 0.5) * 0.3,
            0,
            (Math.random() - 0.5) * 0.3
        );
        
        smokeGroup.add(particle);
        
        // Animations-data
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                0.03 + Math.random() * 0.02,
                (Math.random() - 0.5) * 0.01
            ),
            age: 0,
            maxAge: 2 + Math.random(),
            fadeSpeed: 0.01 + Math.random() * 0.01,
            initialSize: size
        };
        
        // Planlæg næste røgpartikel
        const nextEmitTime = 100 + Math.random() * 200;
        setTimeout(emitSmoke, nextEmitTime);
    }
    
    // Animér røgpartikler
    function animateSmoke() {
        if (!tank.userData.smokeEffect) return;
        
        smokeGroup.children.forEach((particle, index) => {
            particle.userData.age += 0.016; // ca. 60 fps
            
            // Bevæg partiklen
            particle.position.add(particle.userData.velocity);
            
            // Gør størrelse større over tid
            const growth = 1 + particle.userData.age * 0.2;
            const scale = particle.userData.initialSize * growth;
            particle.scale.set(scale, scale, scale);
            
            // Fade ud
            if (particle.userData.age > particle.userData.maxAge * 0.7) {
                particle.material.opacity -= particle.userData.fadeSpeed;
            }
            
            // Fjern gamle partikler
            if (particle.userData.age > particle.userData.maxAge || 
                particle.material.opacity <= 0) {
                smokeGroup.remove(particle);
            }
        });
        
        requestAnimationFrame(animateSmoke);
    }
    
    // Start begge processer
    emitSmoke();
    animateSmoke();
}

// Tilføj skade-effekt på tanks
export function applyDamageEffect(tank) {
    // Skab små eksplosion ved skade
    createDamageEffect(tank);
    
    // Ryst tanken
    const originalPosition = tank.position.clone();
    const shakeIntensity = 0.05;
    const shakeDuration = 300;
    const startTime = Date.now();
    
    function shakeObject() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / shakeDuration;
        
        if (progress < 1) {
            const intensity = shakeIntensity * (1 - progress);
            
            // Tilføj tilfældig offset til position
            tank.position.set(
                originalPosition.x + (Math.random() - 0.5) * intensity * 2,
                originalPosition.y,
                originalPosition.z + (Math.random() - 0.5) * intensity * 2
            );
            
            requestAnimationFrame(shakeObject);
        } else {
            // Nulstil til oprindelig position
            tank.position.copy(originalPosition);
        }
    }
    
    shakeObject();
    
    // Tilføj røg-effekt for meget beskadigede tanks
    if (tank.userData.health < 30 && !tank.userData.smokeEffect) {
        createSmokeEffect(tank);
    }
}

// Fjern røg-effekt
export function removeSmokeEffect(tank) {
    if (tank.userData.smokeEffect) {
        tank.remove(tank.userData.smokeEffect);
        tank.userData.smokeEffect = null;
    }
}