// Syntetiseret lydmanager - genererer lyde direkte uden at indlæse filer
export const SoundManager = {
    initialized: false,
    audioContext: null,
    gainNode: null,
    
    // Initialiser lyd
    init: function() {
        if (this.initialized) return;
        
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.initialized = true;
            
            console.log("Lydmanager initialiseret med syntetiserede lyde");
        } catch (e) {
            console.error('Web Audio API ikke understøttet:', e);
        }
    },
    
    // Indstil global lydstyrke
    setVolume: function(volume) {
        if (!this.initialized) this.init();
        this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    },
    
    // Hovedfunktion til at generere lyde
    play: function(soundType, options = {}) {
        if (!this.initialized) this.init();
        
        // Standard indstillinger
        const defaults = {
            volume: 0.5,
            playbackRate: 1,
            loop: false
        };
        
        // Kombinér standardindstillinger med brugerens indstillinger
        const settings = {...defaults, ...options};
        
        // Opret gain node til denne lyd
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = settings.volume;
        gainNode.connect(this.gainNode);
        
        // Reference til den aktive lydkilde
        let source = null;
        
        // Vælg lydtype og generer lyd
        switch (soundType) {
            case 'shoot':
                source = this.createShootSound(gainNode, settings);
                break;
            case 'explode':
                source = this.createExplosionSound(gainNode, settings);
                break;
            case 'hit':
                source = this.createHitSound(gainNode, settings);
                break;
            case 'engine_start':
                source = this.createEngineStartSound(gainNode, settings);
                break;
            case 'engine_loop':
                source = this.createEngineLoopSound(gainNode, settings);
                break;
            case 'reload':
                source = this.createReloadSound(gainNode, settings);
                break;
            case 'powerup':
                source = this.createPowerupSound(gainNode, settings);
                break;
            default:
                console.warn(`Ukendt lydtype: ${soundType}`);
                return null;
        }
        
        // Hvis der ikke blev oprettet en lyd
        if (!source) return null;
        
        // Returner et kontrolobjekt
        return {
            source: source,
            gainNode: gainNode,
            stop: function() {
                try {
                    source.stop();
                } catch (e) {
                    console.error('Fejl ved stop af lyd:', e);
                }
            },
            setVolume: function(volume) {
                gainNode.gain.value = volume;
            },
            setPlaybackRate: function(rate) {
                if (source.playbackRate) {
                    source.playbackRate.value = rate;
                }
            }
        };
    },
    
    // Generator for skudlyd
    createShootSound: function(gainNode, settings) {
        const duration = 0.3;
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth';
        
        // Frekvens sweep fra høj til lav
        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(55, this.audioContext.currentTime + duration);
        
        // Dynamisk filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + duration);
        filter.Q.value = 5;
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(settings.volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        // Forbind oscillator -> filter -> gain
        oscillator.connect(filter);
        filter.connect(gainNode);
        
        // Start og stop oscillator
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return oscillator;
    },
    
    // Generator for eksplosionslyd
    createExplosionSound: function(gainNode, settings) {
        const duration = 1.0;
        
        // Opret en buffer med støj
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fyld bufferen med støj
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        // Opret og konfigurer støjkilden
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        // Lavpasfilter til støj
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(settings.volume, this.audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        // Forbind støj -> filter -> gain
        noise.connect(filter);
        filter.connect(gainNode);
        
        // Start og stop støjkilden
        noise.start();
        noise.stop(this.audioContext.currentTime + duration);
        
        return noise;
    },
    
    // Generator for rammende lyd
    createHitSound: function(gainNode, settings) {
        const duration = 0.15;
        
        // Metallisk klang oscillator
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + duration);
        
        // Volumen envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(settings.volume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        // Forbind oscillator -> gain
        oscillator.connect(gainNode);
        
        // Start og stop oscillator
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return oscillator;
    },
    
    // Generator for motor-startlyd
    createEngineStartSound: function(gainNode, settings) {
        const duration = 1.0;
        
        // Oscillator for motorlyd
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth';
        
        // Frekvens der stiger som en motor der starter
        oscillator.frequency.setValueAtTime(50, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(100, this.audioContext.currentTime + duration * 0.5);
        oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime + duration * 0.5);
        oscillator.frequency.linearRampToValueAtTime(120, this.audioContext.currentTime + duration);
        
        // Dynamisk filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, this.audioContext.currentTime);
        filter.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + duration);
        filter.Q.value = 10;
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(settings.volume * 0.7, this.audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(settings.volume, this.audioContext.currentTime + duration);
        
        // Forbind oscillator -> filter -> gain
        oscillator.connect(filter);
        filter.connect(gainNode);
        
        // Start og stop oscillator
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return oscillator;
    },
    
    // Generator for motor-loop
    createEngineLoopSound: function(gainNode, settings) {
        // Oscillator for motorlyd
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 60;
        
        // Modulator for rytmisk pulsering
        const modulator = this.audioContext.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = 8;
        
        const modulatorGain = this.audioContext.createGain();
        modulatorGain.gain.value = 20;
        
        // Dynamisk filter for motorlyd
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 5;
        
        // Forbindelser for frekvensmodulering
        modulator.connect(modulatorGain);
        modulatorGain.connect(oscillator.frequency);
        
        // Forbind oscillator -> filter -> gain
        oscillator.connect(filter);
        filter.connect(gainNode);
        
        // Start oscillatorerne
        oscillator.start();
        modulator.start();
        
        // Hvis looping er aktiveret, lad være med at stoppe automatisk
        if (!settings.loop) {
            const duration = 2.0;
            oscillator.stop(this.audioContext.currentTime + duration);
            modulator.stop(this.audioContext.currentTime + duration);
        }
        
        // For at kontrollere afspilningshastighed
        oscillator.playbackRate = {
            value: 1,
            set value(val) {
                oscillator.frequency.value = 40 + val * 20;
                modulator.frequency.value = 5 + val * 3;
            }
        };
        
        return oscillator;
    },
    
    // Generator for genopfyldnings-lyd
    createReloadSound: function(gainNode, settings) {
        const duration = 0.5;
        
        // Serie af korte toner
        this.playSweepTone(140, 200, 0.1, gainNode, 0);
        this.playSweepTone(180, 240, 0.1, gainNode, 0.15);
        this.playSweepTone(220, 280, 0.1, gainNode, 0.3);
        
        // Lang afsluttende tone
        const finalOsc = this.playSweepTone(240, 320, 0.2, gainNode, 0.4);
        
        return finalOsc;
    },
    
    // Generator for powerup lyd
    createPowerupSound: function(gainNode, settings) {
        const duration = 0.6;
        
        // Oscillator for strygninglyd opefter
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(900, this.audioContext.currentTime + duration);
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(settings.volume, this.audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(settings.volume * 0.3, this.audioContext.currentTime + duration * 0.8);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        // Forbind oscillator -> gain
        oscillator.connect(gainNode);
        
        // Start og stop oscillator
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return oscillator;
    },
    
    // Hjælpefunktion til at afspille simple sweep-toner
    playSweepTone: function(startFreq, endFreq, duration, gainNode, startDelay) {
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        
        // Frekvensændring
        osc.frequency.setValueAtTime(startFreq, this.audioContext.currentTime + startDelay);
        osc.frequency.linearRampToValueAtTime(endFreq, this.audioContext.currentTime + startDelay + duration);
        
        // Volume envelope
        const noteGain = this.audioContext.createGain();
        noteGain.gain.setValueAtTime(0, this.audioContext.currentTime + startDelay);
        noteGain.gain.linearRampToValueAtTime(gainNode.gain.value, this.audioContext.currentTime + startDelay + 0.01);
        noteGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + startDelay + duration);
        
        // Forbind oscillator -> noteGain -> hovedGain
        osc.connect(noteGain);
        noteGain.connect(gainNode);
        
        // Start og stop oscillator
        osc.start(this.audioContext.currentTime + startDelay);
        osc.stop(this.audioContext.currentTime + startDelay + duration);
        
        return osc;
    }
};

// Tank bevægelses-lyd controller
export class TankSoundController {
    constructor(tank) {
        this.tank = tank;
        this.engineSound = null;
        this.isMoving = false;
    }
    
    // Start motor lyd
    startEngine() {
        if (this.engineSound) return;
        
        // Afspil startup lyd
        SoundManager.play('engine_start', { volume: 0.4 });
        
        // Start motor loop med lav volume
        setTimeout(() => {
            this.engineSound = SoundManager.play('engine_loop', { 
                loop: true, 
                volume: 0.1,
                playbackRate: 0.7
            });
        }, 1000);
    }
    
    // Opdater motorlyd baseret på hastighed
    updateEngineSound(isMoving, speed = 1) {
        if (!this.engineSound) {
            this.startEngine();
            return;
        }
        
        this.isMoving = isMoving;
        
        // Juster lydstyrke og hastighed baseret på bevægelse
        if (isMoving) {
            // Gradvist øg volume
            this.engineSound.setVolume(Math.min(0.3, this.engineSound.gainNode.gain.value + 0.02));
            // Juster playback rate baseret på hastighed
            this.engineSound.setPlaybackRate(0.7 + (speed * 0.5));
        } else {
            // Gradvist reducer volume til tomgang
            this.engineSound.setVolume(Math.max(0.1, this.engineSound.gainNode.gain.value - 0.02));
            // Reducer playback rate til tomgangshastighed
            this.engineSound.setPlaybackRate(0.7);
        }
    }
    
    // Skud lyd
    playShootSound() {
        SoundManager.play('shoot', { volume: 0.5 });
    }
    
    // Hit lyd
    playHitSound() {
        SoundManager.play('hit', { volume: 0.4 });
    }
    
    // Eksplosion ved destruktion
    playExplosionSound() {
        SoundManager.play('explode', { volume: 0.7 });
    }
    
    // Stop alle lyde
    stopAllSounds() {
        if (this.engineSound) {
            this.engineSound.stop();
            this.engineSound = null;
        }
    }
}