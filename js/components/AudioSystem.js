// ⚡️ Supercharged 8-bit Audio System (drop-in replacement)
// Highlights:
// - Stable sequencer (lookahead scheduler) for tight timing
// - Pulse lead w/ light vibrato + echo
// - Triangle bass groove
// - Fast arpeggio channel
// - Noise drums (kick/snare/hat) for energy
// - Master volume, limiter, and easy pattern tweaks

export class AudioSystem {
    constructor() {
        this.audioContext = null;

        // Master / routing
        this.masterGain = null;
        this.compressor = null;
        this.delay = null;
        this.delayFeedback = null;
        this.delayGain = null;

        // Channel gains
        this.channels = {
            lead: null,
            bass: null,
            arp: null,
            drums: null,
        };

        // Sequencer state
        this.isBackgroundPlaying = false;
        this.bpm = 142; // energetic tempo
        this.stepsPerBeat = 4; // 16ths
        this.lookahead = 25; // ms
        this.scheduleAheadTime = 0.12; // s
        this.currentStep = 0;
        this.nextNoteTime = 0; // seconds in AudioContext time
        this.schedulerId = null;

        // Volume
        this.volume = 0.3;

        // Cached noise buffer
        this._noiseBuffer = null;

        // Patterns (A minor vibe with a bright IV–VI–III–VII flavor)
        this.patternLength = 64; // 4 bars of 16ths

        // Progression by bar: Am | F | C | G (classic chiptune staple)
        this.progression = [
            ['A3','C4','E4'], // Am
            ['F3','A3','C4'], // F
            ['C3','E3','G3'], // C
            ['G3','B3','D4'], // G
        ];

        this.initAudio();
    }

    async initAudio() {
        try {
            document.addEventListener('click', () => this.createAudioContext(), { once: true });
            document.addEventListener('keydown', () => this.createAudioContext(), { once: true });
        } catch (error) {
            console.warn('Audio system initialization failed:', error);
        }
    }

    createAudioContext() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // --- Master chain ---
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.volume;

        // Subtle glue to tame peaks
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.1;

        // Slapback echo for chiptune vibe
        this.delay = this.audioContext.createDelay(0.5);
        this.delay.delayTime.value = 0.18;
        this.delayFeedback = this.audioContext.createGain();
        this.delayFeedback.gain.value = 0.25;
        this.delayGain = this.audioContext.createGain();
        this.delayGain.gain.value = 0.22;

        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delay);
        this.delay.connect(this.delayGain);

        // Channel gains
        this.channels.lead = this.audioContext.createGain();   this.channels.lead.gain.value = 0.6;
        this.channels.bass = this.audioContext.createGain();   this.channels.bass.gain.value = 0.45;
        this.channels.arp  = this.audioContext.createGain();   this.channels.arp.gain.value  = 0.35;
        this.channels.drums= this.audioContext.createGain();   this.channels.drums.gain.value= 0.55;

        // Routing: channels -> (master + delay send)
        Object.values(this.channels).forEach(ch => {
            ch.connect(this.masterGain);
            ch.connect(this.delay);
        });

        // Master -> (delay mix) -> compressor -> destination
        const masterSum = this.audioContext.createGain();
        this.masterGain.connect(masterSum);
        this.delayGain.connect(masterSum);
        masterSum.connect(this.compressor);
        this.compressor.connect(this.audioContext.destination);

        console.log('🎵 Audio system initialized');
        this.startBackgroundMusic();
    }

    // ——————————————————————————————————
    // Public API: Volume + BG control
    // ——————————————————————————————————
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.01);
    }

    startBackgroundMusic() {
        if (!this.audioContext || this.isBackgroundPlaying) return;
        this.isBackgroundPlaying = true;

        // Start sequencer
        this.currentStep = 0;
        this.nextNoteTime = this.audioContext.currentTime + 0.06;
        this.schedulerId = setInterval(() => this.scheduler(), this.lookahead);
    }

    stopBackgroundMusic() {
        this.isBackgroundPlaying = false;
        if (this.schedulerId) {
            clearInterval(this.schedulerId);
            this.schedulerId = null;
        }
    }

    // ——————————————————————————————————
    // Timing & Scheduling
    // ——————————————————————————————————
    secondsPerStep() {
        const spb = 60 / this.bpm;
        return spb / this.stepsPerBeat; // 16ths
    }

    scheduler() {
        if (!this.isBackgroundPlaying || !this.audioContext) return;
        const now = this.audioContext.currentTime;

        while (this.nextNoteTime < now + this.scheduleAheadTime) {
            this.scheduleStep(this.currentStep, this.nextNoteTime);
            this.advanceStep();
        }
    }

    advanceStep() {
        this.nextNoteTime += this.secondsPerStep();
        this.currentStep = (this.currentStep + 1) % this.patternLength;
    }

    // ——————————————————————————————————
    // Patterns
    // ——————————————————————————————————
    scheduleStep(step, time) {
        const bar = Math.floor(step / 16); // 16 steps per bar
        const chord = this.progression[bar % this.progression.length];

        // Drums every step
        this.scheduleDrums(step, time);

        // Bass: driving offbeats w/ triangle
        // Pattern: 1 & a (syncopation) per beat
        const bassNotes = [0, 2, 4, 5]; // degrees inside chord-ish pool
        if (step % 4 === 0 || step % 4 === 3) {
            const pick = bassNotes[(Math.floor(step / 4) + step) % bassNotes.length];
            const n = this.pickBassNote(chord, pick);
            this.playTriangle(n, time, this.secondsPerStep() * 0.95, 0.8, this.channels.bass);
        }

        // Arp: 1/16th cycling through chord tones (octave jumps for sparkle)
        const arpTone = this.rotateChord(chord, step);
        if (step % 1 === 0) {
            const octaveUp = step % 8 < 4 ? 1 : 2; // subtle motion
            this.playSquare(arpTone, time, this.secondsPerStep() * 0.9, 0.35, this.channels.arp, { vibrato: false, octaveOffset: octaveUp });
        }

        // Lead: syncopated 8ths with occasional 16th pickups
        if (step % 2 === 0) {
            const leadNote = this.leadMelodyNote(chord, step);
            this.playSquare(leadNote, time, this.secondsPerStep() * 1.8, 0.65, this.channels.lead, {
                vibrato: true, vibratoHz: 6.2, vibratoDepth: 7
            });
        } else if (step % 8 === 7) {
            // pickup
            const leadNote = this.transpose(this.leadMelodyNote(chord, step - 1), 2);
            this.playSquare(leadNote, time, this.secondsPerStep() * 0.9, 0.5, this.channels.lead, {
                vibrato: true, vibratoHz: 5.5, vibratoDepth: 5
            });
        }
    }

    rotateChord(chord, step) {
        // chord is like ['A3','C4','E4'], cycle with step for arps
        const idx = step % chord.length;
        const base = chord[idx];
        // occasionally lift an octave for sparkle
        if ((Math.floor(step / 4) % 4) === 3 && step % 2 === 0) {
            return this.transpose(base, 12);
        }
        return base;
    }

    pickBassNote(chord, pick) {
        // Use root or fifth mostly, sometimes third, down an octave for weight
        const pool = [ chord[0], chord[2] || chord[1], chord[0], chord[0] ];
        const note = pool[pick % pool.length];
        return this.transpose(note, -12);
    }

    leadMelodyNote(chord, step) {
        // A small motif that climbs then resolves into next chord
        const motif = [0, 2, 4, 7, 5, 4, 2, 0]; // degrees relative to root
        const degree = motif[(Math.floor(step / 2) + step) % motif.length];
        const root = chord[0];
        return this.scaleDegree(root, degree);
    }

    // ——————————————————————————————————
    // Voices
    // ——————————————————————————————————
    playSquare(note, time, dur, vel, out, opts = {}) {
        if (!this.audioContext) return;
        const freq = this.freq(note, opts.octaveOffset || 0);

        const osc = this.audioContext.createOscillator();
        osc.type = 'square';

        // Subtle dual-osc detune for width
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'square';
        osc2.detune.value = 6; // cents

        const g = this.audioContext.createGain();
        g.gain.value = 0;

        // ADSR-ish
        const a = 0.005, d = 0.06, s = 0.6, r = 0.06;
        const max = vel * 0.35;

        const start = time;
        const end = time + dur;

        // envelope
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(max, start + a);
        g.gain.linearRampToValueAtTime(max * s, start + a + d);
        g.gain.setTargetAtTime(0, end - r, 0.02);

        // Vibrato (optional)
        if (opts.vibrato) {
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = opts.vibratoHz ?? 5.5;
            lfoGain.gain.value = opts.vibratoDepth ?? 6; // Hz swing
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfoGain.connect(osc2.frequency);
            lfo.start(start);
            lfo.stop(end + 0.05);
        }

        osc.frequency.setValueAtTime(freq, start);
        osc2.frequency.setValueAtTime(freq, start);

        osc.connect(g);
        osc2.connect(g);
        g.connect(out);

        osc.start(start);
        osc2.start(start);
        osc.stop(end + 0.02);
        osc2.stop(end + 0.02);
    }

    playTriangle(note, time, dur, vel, out) {
        if (!this.audioContext) return;
        const freq = this.freq(note);

        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';

        const lowpass = this.audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1200;

        const g = this.audioContext.createGain();

        const a = 0.004, d = 0.05, s = 0.55, r = 0.08;
        const max = vel * 0.5;

        const start = time;
        const end = time + dur;

        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(max, start + a);
        g.gain.linearRampToValueAtTime(max * s, start + a + d);
        g.gain.setTargetAtTime(0, end - r, 0.03);

        osc.frequency.setValueAtTime(freq, start);
        osc.connect(lowpass);
        lowpass.connect(g);
        g.connect(out);

        osc.start(start);
        osc.stop(end + 0.03);
    }

    // ——————————————————————————————————
    // Drums (noise-based) + kick
    // ——————————————————————————————————
    scheduleDrums(step, time) {
        // Kick on 1 & 3, snare on 2 & 4, hats on every 8th/16th
        const beat = Math.floor(step / 4) % 4;
        const isDownbeat = step % 16 === 0;

        // Kick
        if (step % 16 === 0 || step % 16 === 8) this.playKick(time, 0.9);

        // Snare (backbeats)
        if (step % 16 === 4 || step % 16 === 12) this.playSnare(time);

        // Hats (busy for energy)
        if (step % 2 === 0) this.playHat(time, step % 4 === 2 ? 0.6 : 0.4);

        // Tiny fill at end of bar
        if (isDownbeat && beat === 0 && ((step / 16) % 4 === 3)) {
            this.playHat(time + this.secondsPerStep() * 12, 0.8);
            this.playSnare(time + this.secondsPerStep() * 12.5);
            this.playHat(time + this.secondsPerStep() * 13.5, 0.9);
        }
    }

    playKick(time, power = 1) {
        if (!this.audioContext) return;
        // Pitch-drop sine = classic electronic kick
        const osc = this.audioContext.createOscillator();
        const g = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, time);
        osc.frequency.exponentialRampToValueAtTime(48, time + 0.10);

        const max = 0.9 * power;
        g.gain.setValueAtTime(max, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

        osc.connect(g);
        g.connect(this.channels.drums);

        osc.start(time);
        osc.stop(time + 0.16);
    }

    playSnare(time) {
        if (!this.audioContext) return;
        const noise = this.noiseSource();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1800;
        noiseFilter.Q.value = 0.7;

        const g = this.audioContext.createGain();
        g.gain.setValueAtTime(0.5, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

        noise.connect(noiseFilter);
        noiseFilter.connect(g);
        g.connect(this.channels.drums);

        noise.start(time);
        noise.stop(time + 0.14);
    }

    playHat(time, vel = 0.5) {
        if (!this.audioContext) return;
        const noise = this.noiseSource();
        const hp = this.audioContext.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;

        const g = this.audioContext.createGain();
        g.gain.setValueAtTime(0.35 * vel, time);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

        noise.connect(hp);
        hp.connect(g);
        g.connect(this.channels.drums);

        noise.start(time);
        noise.stop(time + 0.06);
    }

    noiseSource() {
        const buffer = this.getNoiseBuffer();
        const src = this.audioContext.createBufferSource();
        src.buffer = buffer;
        src.loop = false;
        return src;
    }

    getNoiseBuffer() {
        if (this._noiseBuffer) return this._noiseBuffer;
        const length = this.audioContext.sampleRate * 0.5; // 0.5s buffer
        const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        this._noiseBuffer = buffer;
        return buffer;
    }

    // ——————————————————————————————————
    // Utilities
    // ——————————————————————————————————
    // Original createTone kept for SFX; now routes through masterGain
    createTone(frequency, duration, volume = 0.1, type = 'square') {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain || this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        const now = this.audioContext.currentTime;
        const v = (this.volume || 1) * volume;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(v, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }

    // Note helpers
    freq(note, octaveOffset = 0) {
        const n = this.noteToMidi(note) + (octaveOffset * 12);
        return 440 * Math.pow(2, (n - 69) / 12);
    }

    transpose(note, semitones) {
        const n = this.noteToMidi(note) + semitones;
        return this.midiToNote(n);
    }

    scaleDegree(rootNote, degree) {
        // Minor-ish scale degrees: 0=A, 2=B, 3=C, 5=D, 7=E, 8=F, 10=G (A natural minor from A)
        const minorSteps = [0, 2, 3, 5, 7, 8, 10, 12]; // up to octave
        const baseMidi = this.noteToMidi(rootNote);
        const octaves = Math.floor(degree / minorSteps.length);
        const idx = degree % minorSteps.length;
        return this.midiToNote(baseMidi + minorSteps[idx] + (12 * octaves));
    }

    noteToMidi(note) {
        // Accepts forms like "A3", "C#4", "Bb3"
        const m = /^([A-Ga-g])([#b]?)(\d)$/.exec(note);
        if (!m) throw new Error(`Bad note: ${note}`);
        let [_, l, acc, oct] = m;
        l = l.toUpperCase();
        const base = {C:0, D:2, E:4, F:5, G:7, A:9, B:11}[l];
        let semis = base + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
        const midi = semis + (parseInt(oct, 10) + 1) * 12; // MIDI where C4 = 60
        return midi;
    }

    midiToNote(midi) {
        const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const name = names[(midi + 1200) % 12];
        const oct = Math.floor(midi / 12) - 1;
        return `${name}${oct}`;
    }

    // ——————————————————————————————————
    // Original SFX preserved (now they benefit from master chain)
    // ——————————————————————————————————
    playHeartbeat() {
        this.createTone(80, 0.1, 0.15, 'sine');
        setTimeout(() => this.createTone(100, 0.08, 0.12, 'sine'), 120);
    }
    playBreathe() {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const g = this.audioContext.createGain();
        osc.connect(g); g.connect(this.masterGain || this.audioContext.destination);
        osc.type = 'sawtooth';
        const now = this.audioContext.currentTime;
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.3);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.08, now + 0.05);
        g.gain.linearRampToValueAtTime(0.0001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    }
    playBlink() { this.createTone(800, 0.05, 0.1, 'square'); }
    playEyeContact() { this.createTone(600, 0.1, 0.08, 'sine'); }
    playSwallow() {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const g = this.audioContext.createGain();
        osc.connect(g); g.connect(this.masterGain || this.audioContext.destination);
        osc.type = 'triangle';
        const now = this.audioContext.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.12, now + 0.02);
        g.gain.linearRampToValueAtTime(0.0001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    }
    playStep() { this.createTone(120, 0.08, 0.1, 'square'); }
    playJump() {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const g = this.audioContext.createGain();
        osc.connect(g); g.connect(this.masterGain || this.audioContext.destination);
        osc.type = 'square';
        const now = this.audioContext.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.1, now + 0.02);
        g.gain.linearRampToValueAtTime(0.0001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    }
    playAlert() {
        this.createTone(1000, 0.1, 0.15, 'square');
        setTimeout(() => this.createTone(1200, 0.1, 0.15, 'square'), 150);
    }
    playConversationOption() { this.createTone(400, 0.1, 0.08, 'triangle'); }
}
