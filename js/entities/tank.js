import { THREE, scene } from '../scene.js';

// Opret tank model
export function createTank(x, y, z, color) {
    const tank = new THREE.Group();
    tank.position.set(x, y, z);
    
    // Tank krop
    const bodyGeometry = new THREE.BoxGeometry(3, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: color });
    const tankBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    tankBody.position.y = 0.5;
    tank.add(tankBody);
    
    // Tank tårn
    const turretGeometry = new THREE.CylinderGeometry(1, 1, 0.8, 16);
    const turret = new THREE.Mesh(turretGeometry, bodyMaterial);
    turret.position.y = 1.4;
    tank.add(turret);
    
    // Tank kanon
    const cannonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 12);
    const cannon = new THREE.Mesh(cannonGeometry, new THREE.MeshStandardMaterial({ color: 0x333333 }));
    cannon.position.set(0, 0, 1.5);
    cannon.rotation.x = Math.PI / 2;
    turret.add(cannon);
    
    // Tracks
    const trackGeometry = new THREE.BoxGeometry(0.8, 0.4, 4.5);
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
    leftTrack.position.set(-1.4, 0.2, 0);
    tank.add(leftTrack);
    
    const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
    rightTrack.position.set(1.4, 0.2, 0);
    tank.add(rightTrack);
    
    tank.userData = {
        turret: turret,
        cannon: cannon,
        rotation: 0  // Vi gemmer tankens rotation som en simpel vinkel
    };
    
    scene.add(tank);
    return tank;
}