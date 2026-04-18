// 16b-plugin-badge-admin.js
// BadgePlugin — Admin-Methoden (Badge-Verwaltung UI)
// Wird nach 16-plugin-badge.js geladen und erweitert BadgePlugin
// ============================================================

Object.assign(BadgePlugin, {

    renderBadgeAdmin() {
        const container = document.getElementById('adminBadges');
        if (!container) return;
        const defs = this.getBadgeDefinitions();
        const cats = {leistung:'🏆 Leistungs-Badges',faehigkeit:'⚡ Fähigkeiten-Badges',minigame:'🎮 Mini-Game-Badges'};
        let html = '<h3>🏆 Badge-Verwaltung</h3><div style="margin-bottom:12px;">';
        html += '<button class="btn-save" onclick="BadgePlugin.switchBadgePreset(\'default\')" style="margin-right:8px;">Standard-Emojis</button>';
        html += '<button class="btn-save" onclick="BadgePlugin.saveBadgeSettings()">💾 Badge-Settings speichern</button></div>';
        Object.entries(cats).forEach(([cat, title]) => {
            const catBadges = Object.values(defs).filter(b => b.cat === cat);
            html += `<h4 style="margin:16px 0 8px;">${title}</h4><div class="badge-admin-grid">`;
            catBadges.forEach(b => {
                const active = b.active !== false;
                html += `<div class="badge-admin-card ${active ? '' : 'badge-inactive'}">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="font-size:1.5rem;">${b.customIcon || b.emoji}</span>
                        <strong>${b.name}</strong>
                        <label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:0.8rem;">
                            <input type="checkbox" ${active ? 'checked' : ''} onchange="BadgePlugin.toggleBadgeActive('${b.id}',this.checked)">
                            Aktiv
                        </label>
                    </div>
                    <div style="font-size:0.8rem;opacity:0.7;margin-bottom:8px;">${b.desc} (${b.stat})</div>
                    <div class="badge-tier-row">
                        ${b.thresholds.map((t, i) => `<div class="badge-tier-cell">
                            <span class="tier-dot" style="color:${['#888','#2ecc71','#3498db','#9b59b6','#f1c40f'][i]}">${this.TIER_ICONS[i]}</span>
                            <input type="number" value="${t}" min="1"
                                onchange="BadgePlugin._updateThreshold('${b.id}',${i},this.value)"
                                style="width:60px;text-align:center;">
                        </div>`).join('')}
                    </div>
                    <div class="badge-icon-circles" style="margin-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:0.75rem;opacity:0.6;">Icon:</span>
                        ${b.customIcon && b.customIcon.includes('<img') ? `
                            <span style="font-size:1.2rem;">${b.customIcon}</span>
                            <button class="btn-save" style="font-size:0.7rem;padding:2px 6px;" onclick="BadgePlugin.removeBadgeIcon('${b.id}')">✕ Bild entfernen</button>
                        ` : `
                            <input type="text" value="${b.customIcon || b.emoji}" maxlength="4"
                                onchange="BadgePlugin.setBadgeEmoji('${b.id}',this.value)"
                                style="width:50px;text-align:center;padding:2px 4px;">
                        `}
                        <input type="file" id="badgeUpload_${b.id}" accept="image/*" style="display:none"
                            onchange="BadgePlugin.uploadBadgeIcon('${b.id}',event)">
                        <button class="btn-save" style="font-size:0.7rem;padding:2px 6px;"
                            onclick="document.getElementById('badgeUpload_${b.id}').click()">🖼️ Bild</button>
                    </div>
                </div>`;
            });
            html += '</div>';
        });
        container.innerHTML = html;
    },

    _updateThreshold(badgeId, tierIndex, value) {
        if (!quizSettings.badges) quizSettings.badges = {};
        if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
        const defs = this.getBadgeDefinitions();
        const b = defs[badgeId];
        if (!b) return;
        const th = [...b.thresholds];
        th[tierIndex] = parseInt(value) || 1;
        quizSettings.badges[badgeId].thresholds = th;
    },

    toggleBadgeActive(badgeId, active) {
        if (!quizSettings.badges) quizSettings.badges = {};
        if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
        quizSettings.badges[badgeId].active = active;
        this.renderBadgeAdmin();
    },

    setBadgeEmoji(badgeId, emoji) {
        if (!quizSettings.badges) quizSettings.badges = {};
        if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
        quizSettings.badges[badgeId].customIcon = emoji;
    },

    switchBadgePreset(preset) {
        if (preset === 'default') {
            Object.keys(this.DEFAULT_BADGES).forEach(id => {
                if (quizSettings.badges && quizSettings.badges[id]) {
                    delete quizSettings.badges[id].customIcon;
                }
            });
            this.renderBadgeAdmin();
            Toast.show('Standard-Emojis wiederhergestellt', 'info');
        }
    },

    saveBadgeSettings() {
        if (typeof saveMasterBackup === 'function') saveMasterBackup();
        else Toast.show('Badge-Settings gespeichert', 'success');
    },

    selectBadgeIconCircle(badgeId, preset) { this._selectedBadgeCircle = { badgeId, preset }; },

    uploadBadgeIcon(badgeId, event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            if (!quizSettings.badges) quizSettings.badges = {};
            if (!quizSettings.badges[badgeId]) quizSettings.badges[badgeId] = {};
            quizSettings.badges[badgeId].customIcon = `<img src="${e.target.result}" style="width:24px;height:24px;">`;
            this.renderBadgeAdmin();
        };
        reader.readAsDataURL(file);
    },

    removeBadgeIcon(badgeId) {
        if (quizSettings.badges && quizSettings.badges[badgeId]) {
            delete quizSettings.badges[badgeId].customIcon;
        }
        this.renderBadgeAdmin();
    }

});
