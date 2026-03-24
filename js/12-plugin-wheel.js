// 12-plugin-wheel.js
// WheelPlugin - spinner/wheel mini-game
// ============================================================

const WheelPlugin = {
    name: 'WheelPlugin',
    _state: { spinning: false, rotation: 0, segments: [], result: null },

    init() {},
    enable() {},
    disable() {},

    open(title, subtitle) {
        const s = this._state;
        s.spinning = false;
        s.result = null;
        const mg = getMG();
        const maxXP = mg.spinner.maxXP || 50;
        const jDefs = AbilityPlugin.DEFS;
        s.segments = [
            { type: 'joker', jokerType: 'fiftyFifty', label: `${jDefs.fiftyFifty.icon} ${jDefs.fiftyFifty.name}`, color: '#16a085' },
            { type: 'joker', jokerType: 'skip', label: `${jDefs.skip.icon} ${jDefs.skip.name}`, color: '#9b59b6' },
            { type: 'xp', xp: Math.round(maxXP*0.8), label: `+${Math.round(maxXP*0.8)} XP`, color: '#8e44ad' },
            { type: 'joker', jokerType: 'hint', label: `${jDefs.hint.icon} ${jDefs.hint.name}`, color: '#f1c40f' },
            { type: 'joker', jokerType: 'doubleXP', label: `${jDefs.doubleXP.icon} ${jDefs.doubleXP.name}`, color: '#e67e22' },
            { type: 'xp', xp: maxXP, label: `+${maxXP} XP 🎉`, color: '#f39c12' },
            { type: 'joker', jokerType: 'shield', label: `${jDefs.shield.icon} ${jDefs.shield.name}`, color: '#3498db' },
            { type: 'joker', jokerType: 'secondChance', label: `${jDefs.secondChance.icon} ${jDefs.secondChance.name}`, color: '#e91e63' }
        ];
        document.getElementById('spinnerTitle').textContent = title || '🎰 Glücksrad';
        document.getElementById('spinnerSubtitle').textContent = subtitle || 'Drehe das Rad für deine Belohnung!';
        document.getElementById('spinnerResult').textContent = '';
        document.getElementById('spinnerSpinBtn').style.display = '';
        document.getElementById('spinnerSpinBtn').disabled = false;
        document.getElementById('spinnerCloseBtn').style.display = 'none';
        document.getElementById('spinnerOverlay').classList.add('active');
        this.drawWheel(0);
    },

    drawWheel(rotation) {
        const canvas = document.getElementById('spinnerCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 10;
        const segs = this._state.segments;
        const n = segs.length;
        const arc = (2 * Math.PI) / n;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        segs.forEach((seg, i) => {
            const start = i * arc;
            const end = start + arc;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, r, start, end);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Label
            ctx.save();
            ctx.rotate(start + arc / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px system-ui';
            ctx.fillText(seg.label, r - 15, 5);
            ctx.restore();
        });
        ctx.restore();
        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    spin() {
        if (this._state.spinning) return;
        this._state.spinning = true;
        document.getElementById('spinnerSpinBtn').disabled = true;
        const segs = this._state.segments;
        const n = segs.length;
        const arc = (2 * Math.PI) / n;
        // Zufällige Zielrotation: 5-7 Umdrehungen + zufälliger Endwinkel
        const spins = 5 + Math.random() * 2;
        const randomAngle = Math.random() * 2 * Math.PI;
        const targetAngle = 2 * Math.PI * spins + randomAngle;
        const startTime = performance.now();
        const duration = 4000;
        const startRot = this._state.rotation;
        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            const rot = startRot + ease * targetAngle;
            this._state.rotation = rot;
            this.drawWheel(rot);
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this._state.spinning = false;
                // Berechne, welches Segment beim Zeiger ist
                const finalRotation = rot % (2 * Math.PI);
                const pointerAngle = 3 * Math.PI / 2; // Zeiger oben (270°)
                let angleAtPointer = (pointerAngle - finalRotation) % (2 * Math.PI);
                if (angleAtPointer < 0) angleAtPointer += 2 * Math.PI;
                const winIdx = Math.floor(angleAtPointer / arc) % n;
                const segment = segs[winIdx];
                this._state.result = segment;

                // Ergebnis anzeigen
                document.getElementById('spinnerResult').innerHTML =
                    `<div style="font-size:2rem;margin:10px 0;">${segment.label}</div>`;
                document.getElementById('spinnerSpinBtn').style.display = 'none';
                document.getElementById('spinnerCloseBtn').style.display = '';

                // Belohnung basierend auf Typ vergeben
                if (segment.type === 'xp') {
                    applyMiniGameXP(segment.xp);
                    // Badge-Stats für XP
                    if (currentUser && currentUser.badgeStats) {
                        currentUser.badgeStats.spinnerPlays = (currentUser.badgeStats.spinnerPlays || 0) + 1;
                        if (segment.xp >= (getMG().spinner.maxXP || 50)) {
                            currentUser.badgeStats.jackpots = (currentUser.badgeStats.jackpots || 0) + 1;
                        }
                    }
                } else if (segment.type === 'joker') {
                    this._applyJokerReward(segment.jokerType);
                    // Badge-Stats für Joker
                    if (currentUser && currentUser.badgeStats) {
                        currentUser.badgeStats.spinnerPlays = (currentUser.badgeStats.spinnerPlays || 0) + 1;
                        currentUser.badgeStats.spinnerJokersWon = (currentUser.badgeStats.spinnerJokersWon || 0) + 1;
                    }
                }
            }
        };
        requestAnimationFrame(animate);
    },

    close() {
        document.getElementById('spinnerOverlay').classList.remove('active');
        window._mgTestMode = false;
        // Chain: check next mini-game
        if (ClassicQuizPlugin._checkBossTrigger) ClassicQuizPlugin._checkBossTrigger();
    },

    _applyJokerReward(jokerType) {
        if (!currentUser || !currentUser.abilities) return;

        // Im Test-Modus keine Joker gutschreiben
        if (window._mgTestMode) {
            Toast.show(`🎰 Test-Modus: ${AbilityPlugin.DEFS[jokerType]?.name || jokerType} gewonnen (nicht gutgeschrieben)`, 'info');
            return;
        }

        // Abilities initialisieren falls nötig
        AbilityPlugin.initAbilities(currentUser);

        const ability = currentUser.abilities[jokerType];
        if (!ability) {
            console.error(`Unbekannter Joker-Typ: ${jokerType}`);
            return;
        }

        // Ladung hinzufügen
        ability.charges = (ability.charges || 0) + 1;
        ability.unlocked = true;

        // Toast-Benachrichtigung anzeigen
        const def = AbilityPlugin.DEFS[jokerType];
        if (def) {
            Toast.show(`${def.icon} ${def.name} erhalten! (+1 Ladung)`, 'success', 3000);
        }

        // UI aktualisieren
        AbilityPlugin.renderAbilityBar();
        if (PluginRegistry.isEnabled('BadgePlugin')) {
            BadgePlugin.updateAbilitySidebar();
        }
    }
};

// ── SPEEDTAP PLUGIN ─────────────────────────────────────────
