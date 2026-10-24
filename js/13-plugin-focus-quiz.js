// 13-plugin-focus-quiz.js
// FocusQuizPlugin — Zusatz-Quiz aus EINER Themengruppe (nicht Core)
// ============================================================
//
// Ablauf:
//   - Freigeschaltet nach dem ersten normalen Quiz des Tages
//   - Fokus-Gruppe kommt aus dem Rotationsplan (quizSettings.focusQuiz.rotation,
//     Berechnung in 30-globals.js: getActiveFocusPeriod)
//   - Quiz läuft über ClassicQuizPlugin.startQuiz({ focus: true, questions })
//   - XP-Multiplikator greift in ClassicQuizPlugin._processAnswer (focusQuizActive)
//   - Serie + Vollendungs-Prämie werden hier bei QUIZ_COMPLETED / QUIZ_ABANDONED ausgewertet
//
// Serien-Regeln (Nutzer-Entscheidung 2026-10-24):
//   - Serie = erfolgreiche Fokus-Quizze in Folge (Versuche, nicht Tage)
//   - Serie gehört zu einem Rotationszeitraum (periodKey = Gruppe@Startdatum);
//     wechselt der Zeitraum, beginnt sie bei 0
//   - Prämie einmal pro Zeitraum; danach steht die Serie still bis zum Wechsel
//   - Abbruch nach mindestens einer Antwort zählt als Fehlversuch

const FocusQuizPlugin = {
    name: 'FocusQuizPlugin',
    // Laufender Fokus-Versuch (flüchtig): { periodKey, group, start, end }
    _run: null,

    init() {
        EventBus.on(EventBus.EVENTS.USER_SELECTED, () => this.renderButton(), 'FocusQuizPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_STARTED, () => {
            // Normales Quiz gestartet → evtl. liegengebliebenen Fokus-Versuch verwerfen
            if (!focusQuizActive) this._run = null;
        }, 'FocusQuizPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_COMPLETED, (d) => {
            if (d && d.focus) this._finish(d.pct, false);
        }, 'FocusQuizPlugin');
        EventBus.on(EventBus.EVENTS.QUIZ_ABANDONED, (d) => {
            if (d && d.focus) this._finish(0, true);
        }, 'FocusQuizPlugin');
    },
    enable()  { this.renderButton(); },
    disable() { this.renderButton(); },

    cfg() {
        ensureSettingsDefaults(quizSettings);
        const c = quizSettings.focusQuiz;
        if (!Array.isArray(c.rotation)) c.rotation = [];
        return c;
    },

    // Spielerstand holen; Tageszähler beim Datumswechsel zurücksetzen
    _state(user) {
        const st = normalizeFocusState(user);
        const today = new Date().toDateString();
        if (st.lastDate !== today) st.playedToday = 0;
        return st;
    },

    _pool(group) {
        return questions.filter(q => q.active !== false && !q.isCore && q._fileGroup === group);
    },

    // Letzter Tag eines Zeitraums (end ist exklusiv). Kalenderrechnung statt
    // −24 h, sonst liegt die Anzeige an der Zeitumstellung einen Tag daneben.
    _lastDay(period) {
        const e = period.end;
        return new Date(e.getFullYear(), e.getMonth(), e.getDate() - 1);
    },

    _fmtDate(d) {
        return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.';
    },

    // Gesamtbild für den aktuellen Spieler.
    // status: 'off' | 'locked' | 'limit' | 'ready'
    getStatus(user) {
        const cfg = this.cfg();
        if (!user || cfg.enabled === false || !PluginRegistry.isEnabled('FocusQuizPlugin')) return { status: 'off' };
        const period = getActiveFocusPeriod(cfg);
        if (!period) return { status: 'off' };
        const count = Math.max(1, Math.floor(Number(cfg.questionCount)) || 10);
        const pool = this._pool(period.group);
        if (pool.length < count) return { status: 'off', period, poolSize: pool.length };

        const st = this._state(user);
        const samePeriod  = st.periodKey === period.key;
        const streak      = samePeriod ? st.streak : 0;
        const rewarded    = st.rewardedPeriod === period.key;
        const target      = Math.max(1, Math.floor(Number(cfg.streakTarget)) || 5);
        const maxPerDay   = Math.max(0, Math.floor(Number(cfg.maxPerDay)) || 0);
        const today       = new Date().toDateString();
        const unlocked    = user.lastQuizDate === today && (user.dailyQuizCount || 0) >= 1;
        let status = 'ready';
        if (!unlocked) status = 'locked';
        else if (maxPerDay > 0 && st.playedToday >= maxPerDay) status = 'limit';
        return { status, period, count, poolSize: pool.length, streak, target, rewarded,
                 playedToday: st.playedToday, maxPerDay, cfg };
    },

    // Mouse-over-Text: Reichweite und Bedingungen
    _tooltip(s) {
        const c = s.cfg;
        const lines = [
            `Fokus bis ${this._fmtDate(this._lastDay(s.period))}: nur Fragen aus „${s.period.group}" (${s.count} Fragen).`,
            `Richtige Antworten bringen ${c.xpMultiplier}× XP.`,
            `Erfolgreich ab ${c.successPct} % richtig.`,
            s.rewarded
                ? `Vollendungs-Prämie für diesen Zeitraum bereits kassiert — die Serie ruht bis zum nächsten Fokus-Wechsel.`
                : `${s.target} Erfolge in Folge → +${c.completionXP} XP Vollendungs-Prämie (einmal pro Fokus-Zeitraum).`,
            `Ein verfehltes oder abgebrochenes Fokus-Quiz setzt die Serie auf 0. Beim Fokus-Wechsel beginnt sie neu.`
        ];
        if (s.maxPerDay > 0) lines.push(`Heute gespielt: ${s.playedToday} / ${s.maxPerDay}.`);
        return lines.join('\n');
    },

    // Fadenkreuz-Symbol für den Kreis (weiß, roter Zielpunkt)
    CROSSHAIR_SVG:
        '<svg viewBox="0 0 100 100" fill="none" stroke="white" stroke-linecap="round" aria-hidden="true">' +
            '<circle cx="50" cy="50" r="34" stroke-width="5"/>' +
            '<circle cx="50" cy="50" r="16" stroke-width="3" opacity="0.7"/>' +
            '<line x1="50" y1="4"  x2="50" y2="30" stroke-width="5"/>' +
            '<line x1="50" y1="70" x2="50" y2="96" stroke-width="5"/>' +
            '<line x1="4"  y1="50" x2="30" y2="50" stroke-width="5"/>' +
            '<line x1="70" y1="50" x2="96" y2="50" stroke-width="5"/>' +
            '<circle cx="50" cy="50" r="4.5" fill="#ff5252" stroke="none"/>' +
        '</svg>',

    // Kreis oben rechts neben der Siegertreppe. Erscheint erst nach dem
    // ersten Quiz des Tages; Mouse-over erklärt Reichweite und Bedingungen.
    renderButton() {
        const btn = document.getElementById('focusQuizBtn');
        if (!btn) return;
        const wrap = document.getElementById('leaderboardWrap');
        const s = this.getStatus(currentUser);
        if (s.status === 'off' || s.status === 'locked') {
            btn.style.display = 'none';
            if (wrap) wrap.classList.remove('has-focus');
            return;
        }
        const serie = s.rewarded ? 'Prämie ✓' : `Serie ${s.streak}/${s.target}`;
        const info = s.status === 'limit'
            ? `heute ${s.playedToday}× gespielt — morgen wieder`
            : `${s.cfg.xpMultiplier}× XP · ${serie}`;
        btn.innerHTML =
            `<div class="focus-circle">${this.CROSSHAIR_SVG}</div>` +
            `<div class="focus-caption"><strong>Fokus-Quiz</strong>` +
            `<span>${sanitizeHTML(s.period.group)}</span>` +
            `<span>${info}</span></div>`;
        btn.title = this._tooltip(s);
        btn.classList.toggle('is-limit', s.status === 'limit');
        btn.classList.toggle('is-done', !!s.rewarded);
        btn.style.display = 'flex';
        if (wrap) wrap.classList.add('has-focus');
    },

    start() {
        const s = this.getStatus(currentUser);
        if (s.status === 'limit') {
            Toast.show(`🎯 Tageslimit erreicht (${s.maxPerDay} Fokus-Quizze). Morgen wieder!`, 'info', 4000);
            return;
        }
        if (s.status !== 'ready') { this.renderButton(); return; }
        const picked = ClassicQuizPlugin.selectFocusQuestions(currentUser, this._pool(s.period.group), s.count);
        if (picked.length === 0) return;
        this._run = { periodKey: s.period.key, group: s.period.group };
        ClassicQuizPlugin.startQuiz({ focus: true, questions: picked });
        if (!focusQuizActive) { this._run = null; return; }
        Toast.show(`🎯 Fokus-Quiz: nur „${s.period.group}" · ${s.cfg.xpMultiplier}× XP · Ziel: ${s.cfg.successPct} % richtig`, 'info', 4000);
    },

    // Auswertung am Ende eines Fokus-Quiz (auch bei Abbruch).
    _finish(pct, abandoned) {
        const run = this._run;
        this._run = null;
        if (!run || !currentUser) return;
        const cfg = this.cfg();
        const st = this._state(currentUser);
        const now = new Date();

        st.playedToday++;
        st.lastDate = now.toDateString();
        st.lastPlayed = now.toISOString();

        // Neuer Fokus-Zeitraum → Serie beginnt neu
        if (st.periodKey !== run.periodKey) {
            st.periodKey = run.periodKey;
            st.streak = 0;
        }

        const target = Math.max(1, Math.floor(Number(cfg.streakTarget)) || 5);
        const success = !abandoned && pct >= (Number(cfg.successPct) || 0);
        const msgEl = document.getElementById('resultsMessage');
        const appendMsg = t => { if (msgEl && !abandoned) msgEl.textContent += ' · ' + t; };

        // Prämie in diesem Zeitraum schon kassiert → Serie steht still
        if (st.rewardedPeriod === run.periodKey) {
            appendMsg('🎯 Fokus-Prämie für diesen Zeitraum schon kassiert');
            this.renderButton();
            return;
        }

        if (success) {
            st.streak++;
            st.bestStreak = Math.max(st.bestStreak, st.streak);
            if (st.streak >= target) {
                const bonus = Math.max(0, Math.floor(Number(cfg.completionXP)) || 0);
                st.completions++;
                st.rewardedPeriod = run.periodKey;
                applyMiniGameXP(bonus);
                appendMsg(`🏆 Fokus-Serie ${st.streak}/${target} vollendet: +${bonus} XP!`);
                Toast.show(`🏆 Fokus-Serie vollendet! ${target} erfolgreiche Fokus-Quizze in „${run.group}" — +${bonus} XP Vollendungs-Prämie!`, 'success');
            } else {
                appendMsg(`🎯 Fokus-Serie ${st.streak}/${target}`);
            }
        } else {
            const lost = st.streak;
            st.streak = 0;
            if (lost > 0) {
                const why = abandoned ? 'Fokus-Quiz abgebrochen' : `unter ${cfg.successPct} % richtig`;
                Toast.show(`🎯 Fokus-Serie bei ${lost}/${target} zurückgesetzt (${why}). Dein Bestwert bleibt ${st.bestStreak}. Der nächste erfolgreiche Versuch zählt wieder ab 1.`, 'info');
            }
            appendMsg(`🎯 Fokus-Serie 0/${target} (Ziel: ${cfg.successPct} %)`);
        }
        this.renderButton();
    }
};
