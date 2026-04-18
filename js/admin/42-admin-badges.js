// === Admin: Badge-Verwaltung ===

AdminShell.registerPanel('badges', 'Badges', '🏆', container => {
    if (!dataLoaded) {
        container.innerHTML = `<div class="card"><p class="text-muted" style="text-align:center;padding:30px 0">
            Bitte zuerst einen <strong>Ordner laden</strong> (Tab "Datei").</p></div>`;
        return;
    }

    container.innerHTML = `
        <div class="card">
            <p class="text-muted mb-20" style="font-size:0.85rem">
                Badges aktivieren/deaktivieren, Schwellenwerte anpassen und Icons anpassen.
                „Badge-Settings speichern" lädt auch die Master-Datei herunter.
            </p>
            <div id="adminBadges"></div>
        </div>`;

    BadgePlugin.renderBadgeAdmin();
});
