// 19-plugin-fragen2.js
// Fragen2Plugin - question manager v2
// ============================================================

const Fragen2Plugin = {
    name: 'Fragen2Plugin',
    
    // State
    _searchTerm: '',
    _typeFilter: 'all',
    _statusFilter: 'all',
    _groupFilter: 'all',
    _viewMode: 'compact',
    _sortBy: 'number',
    _expandedCards: new Set(),
    _editingId: null,
    _showNewForm: false,
    _newFormType: 'multiple-choice',
    // Imagemap Editor State
    _imMode: 'circle',        // circle | polygon
    _imPoints: [],
    _imRadius: 5,
    _imZones: [],
    _imPolyFinalized: false,
    _imDragIdx: -1,
    _imImageSrc: null,
    _imgDisplayWidth: 300,   // Bildbreite in px für Fragen-Karten (100-600)
    _showImages: true,       // Bilder in Karten/Vorschau anzeigen
    
    init() {},
    enable() {},
    disable() {},
    
    // ── Hauptrender ──
    render() {
        const container = document.getElementById('fragen2Content');
        if (!container) return;

        const allQ = questions || [];
        const totalQ = allQ.length;
        const activeQ = allQ.filter(function(q) { return q.active !== false; }).length;
        const mcQ = allQ.filter(function(q) { return (q.type || 'multiple-choice') === 'multiple-choice'; }).length;
        const textQ = allQ.filter(function(q) { return q.type === 'text'; }).length;
        const imgQ = allQ.filter(function(q) { return q.type === 'imagemap'; }).length;
        const groups = this._getGroups(allQ);
        
        let html = '';
        
        // ── Neue Frage Button ──
        html += '<div style="margin-bottom:15px;">';
        html += '<button class="btn" onclick="Fragen2Plugin._toggleNewForm()" style="padding:10px 24px;font-size:1rem;background:linear-gradient(135deg,#27ae60,#2ecc71);">' + (this._showNewForm ? '✕ Abbrechen' : '＋ Neue Frage erstellen') + '</button>';
        html += '</div>';
        
        // ── Neue-Frage-Formular ──
        if (this._showNewForm) {
            html += this._renderNewForm(groups);
        }
        
        // ── Steuerung (Suche, Nummern, Aktionen) ──
        html += '<div style="padding:12px 15px;background:rgba(255,255,255,0.04);border-radius:12px;margin-bottom:15px;">';
        // Zeile 1: Suche + Sortierung
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">';
        html += '<input class="f2-search" type="text" placeholder="🔍 Suche (Text, Antwort, ID... | #Nr, #5-20)" value="' + sanitizeHTML(this._searchTerm) + '" oninput="Fragen2Plugin._searchTerm=this.value;Fragen2Plugin._renderList()" id="f2SearchInput" style="flex:1;min-width:160px;">';
        html += '<select class="f2-sort-select" onchange="Fragen2Plugin._sortBy=this.value;Fragen2Plugin._renderList()" style="padding:7px 10px;">';
        html += '<option value="number"' + (this._sortBy === 'number' ? ' selected' : '') + '>Nr.</option>';
        html += '<option value="alpha"' + (this._sortBy === 'alpha' ? ' selected' : '') + '>A–Z</option>';
        html += '<option value="group"' + (this._sortBy === 'group' ? ' selected' : '') + '>Gruppe</option>';
        html += '<option value="stats"' + (this._sortBy === 'stats' ? ' selected' : '') + '>Schwierigkeit</option>';
        html += '</select>';
        html += '</div>';
        // Zeile 2: Nummern-Bereich + Batch-Aktionen
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">';
        html += '<input type="text" id="f2BatchInput" placeholder="🎯 Nr. 5, 10-15, 20-40" style="width:200px;padding:6px 10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.82rem;">';
        html += '<button class="btn btn-small" onclick="Fragen2Plugin._batchActivate(true)" title="Bereich aktivieren" style="padding:4px 10px;font-size:0.78rem;">✅ Aktiv</button>';
        html += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._batchActivate(false)" title="Bereich deaktivieren" style="padding:4px 10px;font-size:0.78rem;">❌ Inaktiv</button>';
        html += '<button class="btn btn-small" onclick="Fragen2Plugin._batchExport()" title="Bereich exportieren" style="padding:4px 10px;font-size:0.78rem;background:linear-gradient(135deg,#2980b9,#3498db);">📤 Export</button>';
        html += '</div>';
        // Zeile 3: Schnellaktionen
        html += '<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">';
        html += '<button class="btn btn-small" onclick="Fragen2Plugin._allActivate(true)" title="Alle Fragen aktivieren" style="padding:4px 8px;font-size:0.75rem;">✅ Alle Aktivieren</button>';
        html += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._allActivate(false)" title="Alle Fragen deaktivieren" style="padding:4px 8px;font-size:0.75rem;">❌ Alle Deaktivieren</button>';
        html += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._invertActive()" title="Aktiv/Inaktiv tauschen" style="padding:4px 8px;font-size:0.75rem;">🔄 Invertieren</button>';
        html += '<button class="btn btn-small" onclick="Fragen2Plugin._renumber()" title="Lückenlos 1,2,3... neu nummerieren" style="padding:4px 8px;font-size:0.75rem;">🔢 Nummerieren</button>';
        html += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._resetStats()" title="Fragen-Statistiken zurücksetzen" style="padding:4px 8px;font-size:0.75rem;">📊 Statistik Reset</button>';
        html += '</div>';
        // Zeile 4: Export/Import/Löschen
        html += '<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding-top:6px;">';
        html += '<button class="btn btn-small" onclick="Fragen2Plugin._exportAll()" title="Alle Fragen als eine Datei exportieren" style="padding:4px 8px;font-size:0.75rem;background:linear-gradient(135deg,#2980b9,#3498db);">📤 Alle Export</button>';
        html += '<button class="btn btn-small" onclick="Fragen2Plugin._exportByGroup()" title="Pro Fragengruppe eine Datei exportieren" style="padding:4px 8px;font-size:0.75rem;background:linear-gradient(135deg,#8e44ad,#9b59b6);">📤 Gruppen Export</button>';
        html += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._importQuestions()" title="Fragen-JSON importieren" style="padding:4px 8px;font-size:0.75rem;">📥 Fragen Import</button>';
        html += '<input type="file" id="f2ImportFile" accept=".json" multiple style="display:none;" onchange="Fragen2Plugin._handleImport(event)">';
        html += '<button class="btn btn-small btn-danger" onclick="Fragen2Plugin._deleteAll()" title="Alle Fragen löschen" style="padding:4px 8px;font-size:0.75rem;">🗑️ Löschen</button>';
        html += '</div>';
        // Zeile 5: Ansicht
        html += '<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding-top:6px;">';
        html += '<span style="font-size:0.75rem;opacity:0.5;margin-right:2px;">Ansicht:</span>';
        html += '<button class="btn btn-small btn-secondary' + (this._viewMode === 'compact' ? ' active' : '') + '" onclick="Fragen2Plugin._viewMode=\'compact\';Fragen2Plugin._renderList()" title="Listenansicht" style="padding:4px 8px;font-size:0.75rem;">☰ Liste</button>';
        html += '<button class="btn btn-small btn-secondary' + (this._viewMode === 'grid' ? ' active' : '') + '" onclick="Fragen2Plugin._viewMode=\'grid\';Fragen2Plugin._renderList()" title="Kachelansicht" style="padding:4px 8px;font-size:0.75rem;">▦ Kachel</button>';
        html += '<span style="opacity:0.12;margin:0 4px;">|</span>';
        html += '<button class="btn btn-small' + (this._showImages ? '' : ' btn-secondary') + '" onclick="Fragen2Plugin._showImages=!Fragen2Plugin._showImages;Fragen2Plugin._renderList()" title="' + (this._showImages ? 'Bilder ausblenden' : 'Bilder einblenden') + '" style="padding:4px 8px;font-size:0.75rem;">' + (this._showImages ? '🖼️ Bilder an' : '🖼️ Bilder aus') + '</button>';
        html += '<span style="font-size:0.75rem;opacity:0.5;">Größe:</span>';
        html += '<input type="range" min="100" max="600" step="50" value="' + this._imgDisplayWidth + '" oninput="Fragen2Plugin._imgDisplayWidth=parseInt(this.value);document.getElementById(\'f2ImgSizeVal\').textContent=this.value+\'px\';Fragen2Plugin._renderList()" title="Bilddarstellungsgröße in Karten" style="width:100px;vertical-align:middle;' + (this._showImages ? '' : 'opacity:0.3;') + '">';
        html += '<span id="f2ImgSizeVal" style="font-size:0.7rem;opacity:' + (this._showImages ? '0.6' : '0.3') + ';min-width:36px;">' + this._imgDisplayWidth + 'px</span>';
        html += '</div>';
        html += '</div>';
        
        // ── Filter ──
        html += '<div id="f2FilterBar"></div>';
        
        // Stats + Reset
        html += '<div class="f2-stats-bar" id="f2StatsBar"></div>';
        
        html += '<div id="f2CardList"></div>';
        
        container.innerHTML = html;
        this._renderList();
    },
    
    _resetFilters() {
        this._searchTerm = '';
        this._typeFilter = 'all';
        this._statusFilter = 'all';
        this._groupFilter = 'all';
        this.render();
    },
    
    _getFiltered() {
        var self = this;
        return (questions || []).filter(function(q) {
            if (self._searchTerm) {
                var t = self._searchTerm.trim();
                if (t.charAt(0) === '#') {
                    var nums = self._parseBatch(t.substring(1));
                    if (nums.length === 0) return false;
                    if (nums.indexOf(q.displayNumber) === -1) return false;
                } else {
                    t = t.toLowerCase();
                    if (!(q.text || '').toLowerCase().includes(t) &&
                        !(q.questionId || '').toLowerCase().includes(t) &&
                        !(q.answers || []).some(function(a) { return (a.text || '').toLowerCase().includes(t); }) &&
                        !String(q.displayNumber || '').includes(t)) return false;
                }
            }
            if (self._typeFilter !== 'all' && (q.type || 'multiple-choice') !== self._typeFilter) return false;
            if (self._statusFilter === 'active' && q.active === false) return false;
            if (self._statusFilter === 'inactive' && q.active !== false) return false;
            if (self._groupFilter !== 'all' && (q._fileGroup || 'Manuell') !== self._groupFilter) return false;
            return true;
        });
    },
    
    // ── Nur Kartenliste neu rendern ──
    _renderList() {
        var listEl = document.getElementById('f2CardList');
        if (!listEl) { this.render(); return; }
        
        this._renderFilterBar();
        this._renderStatsBar();
        
        var self = this;
        var filtered = this._sortQuestions(this._getFiltered());
        var html = '';
        
        if (filtered.length === 0) {
            html = '<div class="f2-empty"><div class="f2-empty-icon">🔍</div><p>Keine Fragen gefunden.</p></div>';
        } else {
            html = '<div class="f2-cards view-' + this._viewMode + '">';
            var lastGroup = null;
            filtered.forEach(function(q) {
                if (self._sortBy === 'group') {
                    var g = q._fileGroup || 'Manuell';
                    if (g !== lastGroup) {
                        html += '<div class="f2-group-header" style="grid-column:1/-1;">📁 ' + sanitizeHTML(g) + '</div>';
                        lastGroup = g;
                    }
                }
                html += (self._editingId === q.id) ? self._renderEditForm(q) : self._renderCard(q);
            });
            html += '</div>';
        }
        listEl.innerHTML = html;
    },
    
    _renderFilterBar() {
        var el = document.getElementById('f2FilterBar');
        if (!el) return;
        var self = this;
        var allQ = questions || [];
        var activeQ = allQ.filter(function(q) { return q.active !== false; }).length;
        var totalQ = allQ.length;
        var mcQ = allQ.filter(function(q) { return (q.type || 'multiple-choice') === 'multiple-choice'; }).length;
        var textQ = allQ.filter(function(q) { return q.type === 'text'; }).length;
        var imgQ = allQ.filter(function(q) { return q.type === 'imagemap'; }).length;
        
        // Gruppen ermitteln
        var groupMap = {};
        allQ.forEach(function(q) {
            var g = q._fileGroup || 'Manuell';
            groupMap[g] = (groupMap[g] || 0) + 1;
        });
        var groups = Object.keys(groupMap).sort().map(function(name) { return { name: name, count: groupMap[name] }; });
        
        var html = '';
        // Status + Typ Filter
        html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">';
        html += '<button class="f2-filter-btn' + (this._statusFilter === 'all' ? ' active' : '') + '" onclick="Fragen2Plugin._statusFilter=\'all\';Fragen2Plugin._renderList()">Alle</button>';
        html += '<button class="f2-filter-btn' + (this._statusFilter === 'active' ? ' active' : '') + '" onclick="Fragen2Plugin._statusFilter=\'active\';Fragen2Plugin._renderList()">✅ (' + activeQ + ')</button>';
        html += '<button class="f2-filter-btn' + (this._statusFilter === 'inactive' ? ' active' : '') + '" onclick="Fragen2Plugin._statusFilter=\'inactive\';Fragen2Plugin._renderList()">❌ (' + (totalQ - activeQ) + ')</button>';
        html += '<span style="opacity:0.2;margin:0 5px;">|</span>';
        html += '<button class="f2-filter-btn' + (this._typeFilter === 'all' ? ' active' : '') + '" onclick="Fragen2Plugin._typeFilter=\'all\';Fragen2Plugin._renderList()">Alle</button>';
        html += '<button class="f2-filter-btn' + (this._typeFilter === 'multiple-choice' ? ' active' : '') + '" onclick="Fragen2Plugin._typeFilter=\'multiple-choice\';Fragen2Plugin._renderList()">☑️ MC (' + mcQ + ')</button>';
        html += '<button class="f2-filter-btn' + (this._typeFilter === 'text' ? ' active' : '') + '" onclick="Fragen2Plugin._typeFilter=\'text\';Fragen2Plugin._renderList()">📝 (' + textQ + ')</button>';
        html += '<button class="f2-filter-btn' + (this._typeFilter === 'imagemap' ? ' active' : '') + '" onclick="Fragen2Plugin._typeFilter=\'imagemap\';Fragen2Plugin._renderList()">🗺️ (' + imgQ + ')</button>';
        html += '</div>';
        
        // Gruppen Filter (immer anzeigen wenn Gruppen vorhanden)
        if (groups.length > 1) {
            html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">';
            html += '<span style="font-size:0.82rem;opacity:0.6;padding:6px 0;">📁</span>';
            html += '<button class="f2-filter-btn' + (this._groupFilter === 'all' ? ' active' : '') + '" onclick="Fragen2Plugin._groupFilter=\'all\';Fragen2Plugin._renderList()">Alle</button>';
            groups.forEach(function(g) {
                var sg = g.name.replace(/'/g, "\\'");
                html += '<button class="f2-filter-btn' + (self._groupFilter === g.name ? ' active' : '') + '" onclick="Fragen2Plugin._groupFilter=\'' + sg + '\';Fragen2Plugin._renderList()">' + sanitizeHTML(g.name) + ' (' + g.count + ')</button>';
            });
            html += '</div>';
        }
        
        el.innerHTML = html;
    },
    
    _renderStatsBar() {
        var el = document.getElementById('f2StatsBar');
        if (!el) return;
        var allQ = questions || [];
        var totalQ = allQ.length;
        var filtered = this._getFiltered();
        var dupeCount = this._countDuplicates(allQ);
        var html = '';
        html += '<span class="f2-stat"><strong>' + filtered.length + '</strong>/' + totalQ + '</span>';
        if (dupeCount > 0) {
            html += '<span class="f2-stat" style="color:#e74c3c;">⚠️ <strong>' + dupeCount + '</strong> Duplikate</span>';
            html += '<button class="f2-filter-btn" onclick="Fragen2Plugin._removeDuplicates()" style="font-size:0.78rem;color:#e74c3c;border-color:#e74c3c;">Duplikate entfernen</button>';
        }
        if (this._searchTerm || this._typeFilter !== 'all' || this._statusFilter !== 'all' || this._groupFilter !== 'all') {
            html += '<button class="f2-filter-btn" onclick="Fragen2Plugin._resetFilters()" style="margin-left:auto;font-size:0.78rem;">✕ Reset</button>';
        }
        el.innerHTML = html;
    },
    
    // ── Karte ──
    _renderCard(q) {
        var isActive = q.active !== false;
        var qType = q.type || 'multiple-choice';
        var displayNum = q.displayNumber || '?';
        var questionId = q.questionId || '???';
        var mediaSrc = typeof getMediaSource === 'function' ? getMediaSource(q.media) : null;
        var isExpanded = this._expandedCards.has(q.id);
        var stats = typeof calculateQuestionStats === 'function' ? calculateQuestionStats(questionId) : null;
        var statsPct = stats ? stats.percentage : -1;
        var statsColor = statsPct >= 75 ? '#2ecc71' : statsPct >= 50 ? '#f1c40f' : statsPct >= 0 ? '#e74c3c' : 'rgba(255,255,255,0.1)';
        var typeLabels = { 'multiple-choice': '☑️ MC', 'text': '📝 Text', 'imagemap': '🗺️ Bild' };
        var typeClasses = { 'multiple-choice': 'f2-type-mc', 'text': 'f2-type-text', 'imagemap': 'f2-type-imagemap' };
        
        var h = '<div class="f2-card' + (!isActive ? ' inactive' : '') + '">';
        h += '<div class="f2-card-header">';
        h += '<div style="display:flex;align-items:center;gap:8px;">';
        h += '<input type="checkbox" ' + (isActive ? 'checked' : '') + ' onchange="Fragen2Plugin._toggleActive(' + q.id + ')" style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent);">';
        h += '<span class="f2-card-num">#' + displayNum + '</span>';
        h += '<span class="f2-card-hash">' + questionId + '</span>';
        h += '</div>';
        h += '<div style="display:flex;align-items:center;gap:6px;">';
        h += '<span class="f2-card-type ' + (typeClasses[qType] || '') + '">' + (typeLabels[qType] || qType) + '</span>';
        if (stats) h += '<span style="font-size:0.8rem;font-weight:700;color:' + statsColor + ';">' + statsPct + '%</span>';
        h += '</div></div>';
        
        if (this._showImages && q.media && mediaSrc && q.media.type === 'image') {
            h += '<img src="' + mediaSrc + '" loading="lazy" onerror="this.style.display=\'none\'" style="width:' + this._imgDisplayWidth + 'px;max-width:100%;height:auto;object-fit:contain;border-radius:8px;border:2px solid rgba(255,255,255,0.15);">';
        }
        
        var maxLen = (this._viewMode === 'compact' && !isExpanded) ? 120 : 300;
        var qText = q.text || '';
        h += '<div class="f2-card-question">' + sanitizeHTML(qText.length > maxLen && !isExpanded ? qText.substring(0, maxLen) + '…' : qText) + '</div>';
        
        if (isExpanded || this._viewMode === 'grid') {
            h += this._renderAnswerChips(q);
        }
        
        h += '<div class="f2-card-meta">';
        h += '<span>📁 ' + sanitizeHTML(q._fileGroup || 'Manuell') + '</span>';
        if (q.media) h += '<span>🖼️ ' + (q.media.path ? 'Pfad' : q.media.data ? 'Base64' : q.media.type) + '</span>';
        if (stats) h += '<span>' + stats.totalCorrect + '/' + stats.totalAsked + '</span>';
        h += '</div>';
        
        h += '<div class="f2-card-actions">';
        if (this._viewMode === 'compact') {
            h += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._toggleExpand(' + q.id + ')" style="font-size:0.78rem;padding:4px 10px;">' + (isExpanded ? '▲ Weniger' : '▼ Details') + '</button>';
        }
        h += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._preview(' + q.id + ')" style="font-size:0.78rem;padding:4px 10px;">👁️</button>';
        h += '<button class="btn btn-small" onclick="Fragen2Plugin._startEdit(' + q.id + ')" style="font-size:0.78rem;padding:4px 10px;background:linear-gradient(135deg,#2980b9,#3498db);">✏️ Bearbeiten</button>';
        h += '<button class="btn btn-small btn-danger" onclick="Fragen2Plugin._delete(' + q.id + ')" style="font-size:0.78rem;padding:4px 10px;">🗑️</button>';
        h += '</div>';
        h += '<div class="f2-card-stat-bar"><div class="f2-card-stat-fill" style="width:' + (statsPct >= 0 ? statsPct : 0) + '%;background:' + statsColor + ';"></div></div>';
        h += '</div>';
        return h;
    },
    
    _renderAnswerChips(q) {
        var qType = q.type || 'multiple-choice';
        var h = '';
        if (qType === 'multiple-choice' && q.answers && q.answers.length > 0) {
            h += '<div class="f2-card-answers">';
            q.answers.forEach(function(a) {
                h += '<span class="f2-answer-chip' + (a.correct ? ' correct' : '') + '">' + (a.correct ? '✓ ' : '') + sanitizeHTML(a.text || '') + '</span>';
            });
            h += '</div>';
        } else if (qType === 'text') {
            var ta = typeof getCorrectTextAnswers === 'function' ? getCorrectTextAnswers(q) : (q.correctAnswer || []);
            var arr = Array.isArray(ta) ? ta : [ta];
            if (arr.length > 0 && arr[0]) {
                h += '<div class="f2-card-answers">';
                arr.forEach(function(a) { h += '<span class="f2-answer-chip correct">✓ ' + sanitizeHTML(a) + '</span>'; });
                h += '</div>';
            }
        } else if (qType === 'imagemap') {
            h += '<div style="font-size:0.8rem;opacity:0.6;margin:4px 0;">🎯 ' + (q.targets ? q.targets.length : 0) + ' Zielzone(n)</div>';
        }
        return h;
    },
    
    // ══════════════════════════════════════
    // INLINE BEARBEITEN
    // ══════════════════════════════════════
    _startEdit(qId) {
        this._editingId = qId;
        // Load imagemap zones if editing an imagemap question
        var q = questions.find(function(qq) { return qq.id === qId; });
        if (q && q.type === 'imagemap') {
            this._imZones = q.targets ? JSON.parse(JSON.stringify(q.targets)) : [];
            this._imPoints = [];
            this._imPolyFinalized = false;
            this._imMode = 'circle';
            this._imRadius = 5;
            var mediaSrc = typeof getMediaSource === 'function' ? getMediaSource(q.media) : null;
            this._imImageSrc = mediaSrc;
        }
        this._renderList();
        var self = this;
        setTimeout(function() {
            var el = document.getElementById('f2Edit_' + qId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (q && q.type === 'imagemap') self._imInitCanvas('edit_' + qId);
        }, 100);
    },
    
    _cancelEdit() {
        this._editingId = null;
        this._renderList();
    },
    
    _renderEditForm(q) {
        var qType = q.type || 'multiple-choice';
        var groups = this._getGroups(questions || []);
        var curGroup = q._fileGroup || 'Manuell';
        
        var h = '<div class="f2-card" id="f2Edit_' + q.id + '" style="border-color:var(--accent);background:rgba(247,184,1,0.05);">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
        h += '<strong style="color:var(--accent);">✏️ Frage #' + (q.displayNumber || '?') + ' bearbeiten</strong>';
        h += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._cancelEdit()">✕ Abbrechen</button>';
        h += '</div>';
        
        h += '<label style="font-size:0.85rem;font-weight:600;margin-bottom:4px;display:block;">Fragetext</label>';
        h += '<textarea id="f2EditText_' + q.id + '" rows="3" style="width:100%;padding:10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.95rem;resize:vertical;box-sizing:border-box;">' + sanitizeHTML(q.text || '') + '</textarea>';
        
        h += '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap;">';
        h += '<label style="font-size:0.85rem;font-weight:600;white-space:nowrap;">📁 Gruppe:</label>';
        h += '<select id="f2EditGroup_' + q.id + '" onchange="var inp=document.getElementById(\'f2EditGroupInput_' + q.id + '\');if(this.value===\'__new__\'){inp.style.display=\'block\';inp.focus();}else{inp.style.display=\'none\';}" style="flex:1;padding:6px 10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);">';
        groups.forEach(function(g) {
            h += '<option value="' + sanitizeHTML(g.name) + '"' + (g.name === curGroup ? ' selected' : '') + '>' + sanitizeHTML(g.name) + '</option>';
        });
        h += '<option value="__new__">➕ Neue Gruppe...</option>';
        h += '</select>';
        h += '<input type="text" id="f2EditGroupInput_' + q.id + '" placeholder="Neuer Gruppenname..." style="display:none;flex-basis:100%;padding:6px 10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.85rem;margin-top:4px;">';
        h += '</div>';
        
        if (qType === 'multiple-choice') {
            h += '<label style="font-size:0.85rem;font-weight:600;margin:12px 0 6px;display:block;">Antworten</label>';
            (q.answers || []).forEach(function(a, i) {
                h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">';
                h += '<input type="text" id="f2EditAns_' + q.id + '_' + i + '" value="' + sanitizeHTML(a.text || '') + '" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:2px solid ' + (a.correct ? 'var(--correct)' : 'rgba(255,255,255,0.2)') + ';border-radius:8px;color:var(--text);font-size:0.9rem;">';
                h += '<label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;cursor:pointer;">';
                h += '<input type="checkbox" id="f2EditCorr_' + q.id + '_' + i + '" ' + (a.correct ? 'checked' : '') + ' style="accent-color:var(--correct);"> ✓</label>';
                h += '</div>';
            });
        } else if (qType === 'text') {
            var ta = typeof getCorrectTextAnswers === 'function' ? getCorrectTextAnswers(q) : (q.correctAnswer || []);
            var ansStr = (Array.isArray(ta) ? ta : [ta]).join('\n');
            h += '<label style="font-size:0.85rem;font-weight:600;margin:12px 0 6px;display:block;">Akzeptierte Antworten (eine pro Zeile)</label>';
            h += '<textarea id="f2EditTextAns_' + q.id + '" rows="3" style="width:100%;padding:10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.9rem;box-sizing:border-box;">' + sanitizeHTML(ansStr) + '</textarea>';
        } else if (qType === 'imagemap') {
            h += this._renderImEditor('edit_' + q.id, q);
        }
        
        // Collapsible media path field for MC and FT questions
        if (qType === 'multiple-choice' || qType === 'text') {
            var existingPath = (q.media && q.media.path) ? q.media.path : '';
            var existingData = (q.media && q.media.data) ? true : false;
            var hasMediaData = existingPath || existingData;
            h += '<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">';
            h += '<div onclick="var c=this.nextElementSibling;var a=this.querySelector(\'.f2-collapse-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▾\'}else{c.style.display=\'none\';a.textContent=\'▸\'}" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);user-select:none;">';
            h += '<span class="f2-collapse-arrow" style="font-size:0.75rem;opacity:0.5;width:12px;">' + (hasMediaData ? '▾' : '▸') + '</span>';
            h += '<span style="font-size:0.85rem;font-weight:600;">🖼️ Bild (optional)</span>';
            if (hasMediaData) h += '<span style="font-size:0.7rem;opacity:0.4;margin-left:auto;">Daten vorhanden</span>';
            h += '</div>';
            h += '<div style="padding:10px 12px;display:' + (hasMediaData ? 'block' : 'none') + ';">';
            h += '<div style="display:flex;gap:8px;align-items:center;">';
            h += '<input type="text" id="f2EditMedia_' + q.id + '" value="' + sanitizeHTML(existingPath) + '" placeholder="z.B. medien/Bundesländer/bayern.jpg" oninput="Fragen2Plugin._liveMediaPreview(\'f2EditMedia_' + q.id + '\',\'f2EditMediaPrev_' + q.id + '\')" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.85rem;box-sizing:border-box;">';
            h += '<input type="file" id="f2EditMediaBrowse_' + q.id + '" accept="image/*" style="display:none;" onchange="Fragen2Plugin._handleMediaBrowse(event,\'f2EditMedia_' + q.id + '\')">';
            h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2EditMediaBrowse_' + q.id + '\').click()" style="white-space:nowrap;padding:6px 12px;font-size:0.8rem;">📂 Durchsuchen</button>';
            if (hasMediaData) {
                h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2EditMedia_' + q.id + '\').value=\'\';Fragen2Plugin._editMediaCleared=' + q.id + ';document.getElementById(\'f2EditMediaPrev_' + q.id + '\').innerHTML=\'\';" style="padding:6px 8px;font-size:0.8rem;" title="Bild entfernen">✕</button>';
            }
            h += '</div>';
            if (existingData && !existingPath) {
                h += '<div style="font-size:0.75rem;opacity:0.5;margin-top:3px;">💾 Aktuell: Base64 eingebettet. Pfad eingeben um zu wechseln.</div>';
            }
            h += '<div style="font-size:0.72rem;opacity:0.4;margin-top:3px;">Unterordner manuell eingeben — Browser kann Unterordner nicht erkennen</div>';
            h += '<div id="f2EditMediaPrev_' + q.id + '" style="margin-top:6px;">';
            if (q.media) {
                var prevSrc = typeof getMediaSource === 'function' ? getMediaSource(q.media) : null;
                if (prevSrc) {
                    h += '<img src="' + prevSrc + '" style="max-width:200px;max-height:120px;border-radius:8px;border:2px solid rgba(255,255,255,0.15);object-fit:contain;" onerror="this.parentNode.innerHTML=\'<span style=color:#e74c3c;font-size:0.8rem;>❌ Bild nicht gefunden</span>\'">';
                }
            }
            h += '</div>';
            h += '</div></div>';
        }

        // Collapsible explanation section - auto-open if data exists
        var hasExplData = q.explanation || (q.explanationMedia && q.explanationMedia.path);
        h += '<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">';
        h += '<div onclick="var c=this.nextElementSibling;var a=this.querySelector(\'.f2-collapse-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▾\'}else{c.style.display=\'none\';a.textContent=\'▸\'}" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);user-select:none;">';
        h += '<span class="f2-collapse-arrow" style="font-size:0.75rem;opacity:0.5;width:12px;">' + (hasExplData ? '▾' : '▸') + '</span>';
        h += '<span style="font-size:0.85rem;font-weight:600;">📖 Erklärung (optional)</span>';
        if (hasExplData) h += '<span style="font-size:0.7rem;opacity:0.4;margin-left:auto;">Daten vorhanden</span>';
        h += '</div>';
        h += '<div style="padding:10px 12px;display:' + (hasExplData ? 'block' : 'none') + ';">';
        h += '<input type="text" id="f2EditExpl_' + q.id + '" value="' + sanitizeHTML(q.explanation || '') + '" placeholder="Wird nach falscher Antwort angezeigt..." style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);border-radius:8px;color:var(--text);font-size:0.85rem;box-sizing:border-box;">';
        var explMediaPath = (q.explanationMedia && q.explanationMedia.path) ? q.explanationMedia.path : '';
        h += '<div style="display:flex;gap:8px;align-items:center;margin-top:4px;">';
        h += '<input type="text" id="f2EditExplMedia_' + q.id + '" value="' + sanitizeHTML(explMediaPath) + '" placeholder="Bild zur Erklärung (z.B. medien/erkl_001.jpg)" oninput="Fragen2Plugin._liveMediaPreview(\'f2EditExplMedia_' + q.id + '\',\'f2EditExplMediaPrev_' + q.id + '\')" style="flex:1;padding:6px 8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:var(--text);font-size:0.8rem;box-sizing:border-box;">';
        h += '<input type="file" id="f2EditExplMediaBrowse_' + q.id + '" accept="image/*" style="display:none;" onchange="Fragen2Plugin._handleMediaBrowse(event,\'f2EditExplMedia_' + q.id + '\')">';
        h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2EditExplMediaBrowse_' + q.id + '\').click()" style="padding:4px 8px;font-size:0.75rem;">📂</button>';
        if (explMediaPath) h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2EditExplMedia_' + q.id + '\').value=\'\';document.getElementById(\'f2EditExplMediaPrev_' + q.id + '\').innerHTML=\'\';" style="padding:4px 6px;font-size:0.75rem;" title="Bild entfernen">✕</button>';
        h += '</div>';
        h += '<div id="f2EditExplMediaPrev_' + q.id + '" style="margin-top:4px;">';
        if (explMediaPath) h += '<img src="' + explMediaPath + '" style="max-width:150px;max-height:80px;border-radius:6px;object-fit:contain;" onerror="this.style.display=\'none\'">';
        h += '</div>';
        h += '</div></div>';

        // Collapsible hint section - auto-open if data exists
        var hasHintData = q.hint || (q.hintMedia && q.hintMedia.path);
        h += '<div style="margin-top:6px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">';
        h += '<div onclick="var c=this.nextElementSibling;var a=this.querySelector(\'.f2-collapse-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▾\'}else{c.style.display=\'none\';a.textContent=\'▸\'}" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);user-select:none;">';
        h += '<span class="f2-collapse-arrow" style="font-size:0.75rem;opacity:0.5;width:12px;">' + (hasHintData ? '▾' : '▸') + '</span>';
        h += '<span style="font-size:0.85rem;font-weight:600;">💡 Hinweis (optional)</span>';
        if (hasHintData) h += '<span style="font-size:0.7rem;opacity:0.4;margin-left:auto;">Daten vorhanden</span>';
        h += '</div>';
        h += '<div style="padding:10px 12px;display:' + (hasHintData ? 'block' : 'none') + ';">';
        h += '<input type="text" id="f2EditHint_' + q.id + '" value="' + sanitizeHTML(q.hint || '') + '" placeholder="Wird bei Hinweis-Fähigkeit angezeigt..." style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);border-radius:8px;color:var(--text);font-size:0.85rem;box-sizing:border-box;">';
        var hintMediaPath = (q.hintMedia && q.hintMedia.path) ? q.hintMedia.path : '';
        h += '<div style="display:flex;gap:8px;align-items:center;margin-top:4px;">';
        h += '<input type="text" id="f2EditHintMedia_' + q.id + '" value="' + sanitizeHTML(hintMediaPath) + '" placeholder="Bild zum Hinweis (z.B. medien/hint_001.jpg)" oninput="Fragen2Plugin._liveMediaPreview(\'f2EditHintMedia_' + q.id + '\',\'f2EditHintMediaPrev_' + q.id + '\')" style="flex:1;padding:6px 8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:var(--text);font-size:0.8rem;box-sizing:border-box;">';
        h += '<input type="file" id="f2EditHintMediaBrowse_' + q.id + '" accept="image/*" style="display:none;" onchange="Fragen2Plugin._handleMediaBrowse(event,\'f2EditHintMedia_' + q.id + '\')">';
        h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2EditHintMediaBrowse_' + q.id + '\').click()" style="padding:4px 8px;font-size:0.75rem;">📂</button>';
        if (hintMediaPath) h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2EditHintMedia_' + q.id + '\').value=\'\';document.getElementById(\'f2EditHintMediaPrev_' + q.id + '\').innerHTML=\'\';" style="padding:4px 6px;font-size:0.75rem;" title="Bild entfernen">✕</button>';
        h += '</div>';
        h += '<div id="f2EditHintMediaPrev_' + q.id + '" style="margin-top:4px;">';
        if (hintMediaPath) h += '<img src="' + hintMediaPath + '" style="max-width:150px;max-height:80px;border-radius:6px;object-fit:contain;" onerror="this.style.display=\'none\'">';
        h += '</div>';
        h += '</div></div>';

        h += '<div style="display:flex;gap:8px;margin-top:14px;">';
        h += '<button class="btn" onclick="Fragen2Plugin._saveEdit(' + q.id + ')" style="padding:10px 24px;">💾 Speichern</button>';
        h += '<button class="btn btn-secondary" onclick="Fragen2Plugin._cancelEdit()">Abbrechen</button>';
        h += '</div></div>';
        return h;
    },
    
    _saveEdit(qId) {
        var q = questions.find(function(qq) { return qq.id === qId; });
        if (!q) return;
        var newText = document.getElementById('f2EditText_' + qId);
        if (!newText || !newText.value.trim()) { Toast.show('Fragetext darf nicht leer sein!', 'warning'); return; }
        
        q.text = newText.value.trim();
        var groupSel = document.getElementById('f2EditGroup_' + qId);
        if (groupSel) {
            var gVal = groupSel.value;
            if (gVal === '__new__') {
                var customEl = document.getElementById('f2EditGroupInput_' + qId);
                gVal = customEl && customEl.value.trim() ? customEl.value.trim() : q._fileGroup;
            }
            q._fileGroup = gVal;
        }
        var explEl = document.getElementById('f2EditExpl_' + qId);
        if (explEl) q.explanation = explEl.value.trim() || null;
        // Explanation media
        var explMediaEl = document.getElementById('f2EditExplMedia_' + qId);
        if (explMediaEl) {
            var explMediaVal = explMediaEl.value.trim();
            if (explMediaVal) q.explanationMedia = { type: 'image', path: explMediaVal };
            else if (!explMediaVal && q.explanationMedia && q.explanationMedia.path) q.explanationMedia = null;
        }
        // Hint
        var hintEl = document.getElementById('f2EditHint_' + qId);
        if (hintEl) q.hint = hintEl.value.trim() || null;
        // Hint media
        var hintMediaEl = document.getElementById('f2EditHintMedia_' + qId);
        if (hintMediaEl) {
            var hintMediaVal = hintMediaEl.value.trim();
            if (hintMediaVal) q.hintMedia = { type: 'image', path: hintMediaVal };
            else if (!hintMediaVal && q.hintMedia && q.hintMedia.path) q.hintMedia = null;
        }

        var qType = q.type || 'multiple-choice';
        if (qType === 'multiple-choice' && q.answers) {
            var hasCorrect = false;
            q.answers.forEach(function(a, i) {
                var ansI = document.getElementById('f2EditAns_' + qId + '_' + i);
                var corrI = document.getElementById('f2EditCorr_' + qId + '_' + i);
                if (ansI) a.text = ansI.value.trim();
                if (corrI) { a.correct = corrI.checked; if (a.correct) hasCorrect = true; }
            });
            if (!hasCorrect) { Toast.show('Mindestens eine richtige Antwort markieren!', 'warning'); return; }
        }
        if (qType === 'text') {
            var tEl = document.getElementById('f2EditTextAns_' + qId);
            if (tEl) {
                var lines = tEl.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
                if (lines.length === 0) { Toast.show('Mindestens eine Antwort eingeben!', 'warning'); return; }
                q.correctAnswer = lines;
                if (q.answers && q.answers[0] && q.answers[0].type === 'text') q.answers[0].correctAnswers = lines;
            }
        }
        if (qType === 'imagemap') {
            var targets = this._imGetTargets();
            if (targets.length === 0) { Toast.show('Mindestens eine Zielzone definieren!', 'warning'); return; }
            q.targets = targets;
            var imgPath = document.getElementById('f2ImgPath');
            if (imgPath && imgPath.value.trim()) {
                q.media = { type: 'image', path: imgPath.value.trim() };
            } else if (this._imImageSrc && !q.media) {
                q.media = { type: 'image', data: this._imImageSrc };
            }
        }
        // Save media for MC and FT questions
        if (qType === 'multiple-choice' || qType === 'text') {
            var mediaPathEl = document.getElementById('f2EditMedia_' + qId);
            if (mediaPathEl) {
                var mediaVal = mediaPathEl.value.trim();
                if (mediaVal) {
                    q.media = { type: 'image', path: mediaVal };
                } else if (this._editMediaCleared === qId) {
                    q.media = null;
                    this._editMediaCleared = null;
                }
            }
        }

        this._editingId = null;
        this._renderList();
        Toast.show('Frage #' + (q.displayNumber || '?') + ' gespeichert!', 'success');
    },
    
    // ══════════════════════════════════════
    // NEUE FRAGE ERSTELLEN
    // ══════════════════════════════════════
    _toggleNewForm() {
        this._showNewForm = !this._showNewForm;
        if (!this._showNewForm) this._imReset();
        this.render();
    },
    
    _renderNewForm(groups) {
        var ft = this._newFormType;
        var h = '<div class="f2-card" style="border-color:#2ecc71;background:rgba(46,204,113,0.05);margin-bottom:20px;">';
        h += '<strong style="color:#2ecc71;font-size:1.1rem;">＋ Neue Frage erstellen</strong>';
        
        h += '<div style="display:flex;gap:8px;margin:12px 0;">';
        h += '<button class="f2-filter-btn' + (ft === 'multiple-choice' ? ' active' : '') + '" onclick="Fragen2Plugin._newFormType=\'multiple-choice\';Fragen2Plugin.render()">☑️ Multiple Choice</button>';
        h += '<button class="f2-filter-btn' + (ft === 'text' ? ' active' : '') + '" onclick="Fragen2Plugin._newFormType=\'text\';Fragen2Plugin.render()">📝 Freitext</button>';
        h += '<button class="f2-filter-btn' + (ft === 'imagemap' ? ' active' : '') + '" onclick="Fragen2Plugin._newFormType=\'imagemap\';Fragen2Plugin._imReset();Fragen2Plugin.render()">🗺️ Bildklick</button>';
        h += '</div>';
        
        h += '<label style="font-size:0.85rem;font-weight:600;margin-bottom:4px;display:block;">Fragetext</label>';
        h += '<textarea id="f2NewText" rows="3" placeholder="Die Frage eingeben..." style="width:100%;padding:10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.95rem;resize:vertical;box-sizing:border-box;"></textarea>';
        
        h += '<div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap;">';
        h += '<label style="font-size:0.85rem;font-weight:600;white-space:nowrap;">📁 Gruppe:</label>';
        h += '<select id="f2NewGroup" onchange="var inp=document.getElementById(\'f2NewGroupInput\');if(this.value===\'__new__\'){inp.style.display=\'block\';inp.focus();}else{inp.style.display=\'none\';}" style="flex:1;padding:6px 10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);">';
        if (!groups || groups.length === 0) {
            h += '<option value="Manuell">Manuell</option>';
        } else {
            groups.forEach(function(g) { h += '<option value="' + sanitizeHTML(g.name) + '">' + sanitizeHTML(g.name) + '</option>'; });
        }
        h += '<option value="__new__">➕ Neue Gruppe...</option>';
        h += '</select>';
        h += '<input type="text" id="f2NewGroupInput" placeholder="Neuer Gruppenname..." style="display:none;flex-basis:100%;padding:6px 10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.85rem;margin-top:4px;">';
        h += '</div>';
        
        var ansCount = (typeof CONFIG !== 'undefined' && CONFIG.QUIZ && CONFIG.QUIZ.DEFAULT_ANSWER_COUNT) ? CONFIG.QUIZ.DEFAULT_ANSWER_COUNT : 4;
        
        if (ft === 'multiple-choice') {
            h += '<label style="font-size:0.85rem;font-weight:600;margin:12px 0 6px;display:block;">Antworten</label>';
            for (var i = 0; i < ansCount; i++) {
                h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">';
                h += '<input type="text" id="f2NewAns_' + i + '" placeholder="Antwort ' + (i + 1) + '" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.9rem;">';
                h += '<label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;cursor:pointer;">';
                h += '<input type="checkbox" id="f2NewCorr_' + i + '" style="accent-color:var(--correct);"> ✓</label>';
                h += '</div>';
            }
        }
        if (ft === 'text') {
            h += '<label style="font-size:0.85rem;font-weight:600;margin:12px 0 6px;display:block;">Akzeptierte Antworten (eine pro Zeile)</label>';
            h += '<textarea id="f2NewTextAns" rows="3" placeholder="z.B. Berlin" style="width:100%;padding:10px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.9rem;box-sizing:border-box;"></textarea>';
        }
        if (ft === 'imagemap') {
            h += this._renderImEditor('new');
        }
        
        // Collapsible media path field for MC and FT
        if (ft === 'multiple-choice' || ft === 'text') {
            h += '<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">';
            h += '<div onclick="var c=this.nextElementSibling;var a=this.querySelector(\'.f2-collapse-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▾\'}else{c.style.display=\'none\';a.textContent=\'▸\'}" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);user-select:none;">';
            h += '<span class="f2-collapse-arrow" style="font-size:0.75rem;opacity:0.5;width:12px;">▸</span>';
            h += '<span style="font-size:0.85rem;font-weight:600;">🖼️ Bild (optional)</span>';
            h += '</div>';
            h += '<div style="padding:10px 12px;display:none;">';
            h += '<div style="display:flex;gap:8px;align-items:center;">';
            h += '<input type="text" id="f2NewMedia" placeholder="z.B. medien/Bundesländer/bayern.jpg" oninput="Fragen2Plugin._liveMediaPreview(\'f2NewMedia\',\'f2NewMediaPreview\')" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.85rem;box-sizing:border-box;">';
            h += '<input type="file" id="f2NewMediaBrowse" accept="image/*" style="display:none;" onchange="Fragen2Plugin._handleMediaBrowse(event,\'f2NewMedia\')">';
            h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2NewMediaBrowse\').click()" style="white-space:nowrap;padding:6px 12px;font-size:0.8rem;">📂 Durchsuchen</button>';
            h += '</div>';
            h += '<div style="font-size:0.72rem;opacity:0.4;margin-top:3px;">Unterordner manuell eingeben — Browser kann Unterordner nicht erkennen</div>';
            h += '<div id="f2NewMediaPreview" style="margin-top:6px;"></div>';
            h += '</div></div>';
        }

        // Collapsible explanation section - always collapsed for new questions
        h += '<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">';
        h += '<div onclick="var c=this.nextElementSibling;var a=this.querySelector(\'.f2-collapse-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▾\'}else{c.style.display=\'none\';a.textContent=\'▸\'}" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);user-select:none;">';
        h += '<span class="f2-collapse-arrow" style="font-size:0.75rem;opacity:0.5;width:12px;">▸</span>';
        h += '<span style="font-size:0.85rem;font-weight:600;">📖 Erklärung (optional)</span>';
        h += '</div>';
        h += '<div style="padding:10px 12px;display:none;">';
        h += '<input type="text" id="f2NewExpl" placeholder="Wird nach falscher Antwort angezeigt..." style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);border-radius:8px;color:var(--text);font-size:0.85rem;box-sizing:border-box;">';
        h += '<div style="display:flex;gap:8px;align-items:center;margin-top:4px;">';
        h += '<input type="text" id="f2NewExplMedia" placeholder="Bild zur Erklärung (z.B. medien/erkl_001.jpg)" oninput="Fragen2Plugin._liveMediaPreview(\'f2NewExplMedia\',\'f2NewExplMediaPrev\')" style="flex:1;padding:6px 8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:var(--text);font-size:0.8rem;box-sizing:border-box;">';
        h += '<input type="file" id="f2NewExplMediaBrowse" accept="image/*" style="display:none;" onchange="Fragen2Plugin._handleMediaBrowse(event,\'f2NewExplMedia\')">';
        h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2NewExplMediaBrowse\').click()" style="padding:4px 8px;font-size:0.75rem;">📂</button>';
        h += '</div>';
        h += '<div id="f2NewExplMediaPrev" style="margin-top:4px;"></div>';
        h += '</div></div>';

        // Collapsible hint section - always collapsed for new questions
        h += '<div style="margin-top:6px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;">';
        h += '<div onclick="var c=this.nextElementSibling;var a=this.querySelector(\'.f2-collapse-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▾\'}else{c.style.display=\'none\';a.textContent=\'▸\'}" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);user-select:none;">';
        h += '<span class="f2-collapse-arrow" style="font-size:0.75rem;opacity:0.5;width:12px;">▸</span>';
        h += '<span style="font-size:0.85rem;font-weight:600;">💡 Hinweis (optional)</span>';
        h += '</div>';
        h += '<div style="padding:10px 12px;display:none;">';
        h += '<input type="text" id="f2NewHint" placeholder="Wird bei Hinweis-Fähigkeit angezeigt..." style="width:100%;padding:8px;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);border-radius:8px;color:var(--text);font-size:0.85rem;box-sizing:border-box;">';
        h += '<div style="display:flex;gap:8px;align-items:center;margin-top:4px;">';
        h += '<input type="text" id="f2NewHintMedia" placeholder="Bild zum Hinweis (z.B. medien/hint_001.jpg)" oninput="Fragen2Plugin._liveMediaPreview(\'f2NewHintMedia\',\'f2NewHintMediaPrev\')" style="flex:1;padding:6px 8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:var(--text);font-size:0.8rem;box-sizing:border-box;">';
        h += '<input type="file" id="f2NewHintMediaBrowse" accept="image/*" style="display:none;" onchange="Fragen2Plugin._handleMediaBrowse(event,\'f2NewHintMedia\')">';
        h += '<button type="button" class="btn btn-secondary btn-small" onclick="document.getElementById(\'f2NewHintMediaBrowse\').click()" style="padding:4px 8px;font-size:0.75rem;">📂</button>';
        h += '</div>';
        h += '<div id="f2NewHintMediaPrev" style="margin-top:4px;"></div>';
        h += '</div></div>';

        h += '<div style="display:flex;gap:8px;margin-top:14px;">';
        h += '<button class="btn" onclick="Fragen2Plugin._saveNew()" style="padding:10px 24px;background:linear-gradient(135deg,#27ae60,#2ecc71);">＋ Frage erstellen</button>';
        h += '<button class="btn btn-secondary" onclick="Fragen2Plugin._toggleNewForm()">Abbrechen</button>';
        h += '</div></div>';
        return h;
    },
    
    _saveNew() {
        var textEl = document.getElementById('f2NewText');
        if (!textEl || !textEl.value.trim()) { Toast.show('Fragetext darf nicht leer sein!', 'warning'); return; }
        
        var ft = this._newFormType;
        var text = textEl.value.trim();
        var groupEl = document.getElementById('f2NewGroup');
        var group = groupEl ? groupEl.value : 'Manuell';
        if (group === '__new__') {
            var customEl = document.getElementById('f2NewGroupInput');
            group = customEl && customEl.value.trim() ? customEl.value.trim() : 'Manuell';
        }
        var explEl = document.getElementById('f2NewExpl');
        var explanation = explEl && explEl.value.trim() ? explEl.value.trim() : null;
        var explMediaEl = document.getElementById('f2NewExplMedia');
        var explanationMedia = (explMediaEl && explMediaEl.value.trim()) ? { type: 'image', path: explMediaEl.value.trim() } : null;
        var hintEl = document.getElementById('f2NewHint');
        var hint = hintEl && hintEl.value.trim() ? hintEl.value.trim() : null;
        var hintMediaEl = document.getElementById('f2NewHintMedia');
        var hintMedia = (hintMediaEl && hintMediaEl.value.trim()) ? { type: 'image', path: hintMediaEl.value.trim() } : null;
        var newId = Date.now() + Math.floor(Math.random() * 1000);
        var displayNum = typeof getNextDisplayNumber === 'function' ? getNextDisplayNumber() : (questions.length + 1);
        var ansCount = (typeof CONFIG !== 'undefined' && CONFIG.QUIZ && CONFIG.QUIZ.DEFAULT_ANSWER_COUNT) ? CONFIG.QUIZ.DEFAULT_ANSWER_COUNT : 4;

        var newQ = {
            id: newId,
            displayNumber: displayNum,
            text: text,
            active: true,
            _fileGroup: group,
            explanation: explanation,
            explanationMedia: explanationMedia,
            hint: hint,
            hintMedia: hintMedia,
            media: null
        };
        
        if (ft === 'multiple-choice') {
            var answers = [];
            var hasCorrect = false;
            for (var i = 0; i < ansCount; i++) {
                var ansEl = document.getElementById('f2NewAns_' + i);
                var corrEl = document.getElementById('f2NewCorr_' + i);
                var ansText = ansEl ? ansEl.value.trim() : '';
                if (ansText) {
                    var isCorr = corrEl ? corrEl.checked : false;
                    if (isCorr) hasCorrect = true;
                    answers.push({ text: ansText, correct: isCorr });
                }
            }
            if (answers.length < 2) { Toast.show('Mindestens 2 Antworten eingeben!', 'warning'); return; }
            if (!hasCorrect) { Toast.show('Mindestens eine richtige Antwort markieren!', 'warning'); return; }
            newQ.type = QUESTION_TYPES.MULTIPLE_CHOICE;
            newQ.answers = answers;
        } else if (ft === 'text') {
            var tEl = document.getElementById('f2NewTextAns');
            var lines = tEl ? tEl.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; }) : [];
            if (lines.length === 0) { Toast.show('Mindestens eine Antwort eingeben!', 'warning'); return; }
            newQ.type = QUESTION_TYPES.TEXT;
            newQ.correctAnswer = lines;
            newQ.answers = [{ type: 'text', correctAnswers: lines }];
        } else if (ft === 'imagemap') {
            var targets = this._imGetTargets();
            if (targets.length === 0) { Toast.show('Mindestens eine Zielzone definieren!', 'warning'); return; }
            if (!this._imImageSrc) { Toast.show('Bitte zuerst ein Bild laden!', 'warning'); return; }
            newQ.type = QUESTION_TYPES.IMAGEMAP;
            newQ.targets = targets;
            var imgPath = document.getElementById('f2ImgPath');
            if (imgPath && imgPath.value.trim()) {
                newQ.media = { type: 'image', path: imgPath.value.trim() };
            } else if (this._imImageSrc) {
                newQ.media = { type: 'image', data: this._imImageSrc };
            }
        }
        // Save media for MC and FT questions
        if (ft === 'multiple-choice' || ft === 'text') {
            var mediaPathEl = document.getElementById('f2NewMedia');
            if (mediaPathEl && mediaPathEl.value.trim()) {
                newQ.media = { type: 'image', path: mediaPathEl.value.trim() };
            }
        }

        newQ.questionId = typeof generateQuestionHash === 'function' ? generateQuestionHash(newQ) : ('Q_' + newId);
        
        if (typeof normalizeQuestion === 'function') {
            var dn = displayNum;
            var fg = group;
            newQ = normalizeQuestion(newQ);
            newQ.displayNumber = dn;
            newQ._fileGroup = fg;
        }
        
        questions.push(newQ);
        this._showNewForm = false;
        Toast.show('Frage #' + displayNum + ' erstellt!', 'success');
        this.render();
    },
    
    // ══════════════════════════════════════
    // HELFER
    // ══════════════════════════════════════
    _sortQuestions(arr) {
        var self = this;
        return arr.slice().sort(function(a, b) {
            if (self._sortBy === 'alpha') return (a.text || '').localeCompare(b.text || '');
            if (self._sortBy === 'group') {
                var gA = (a._fileGroup || 'Manuell').toLowerCase();
                var gB = (b._fileGroup || 'Manuell').toLowerCase();
                if (gA !== gB) return gA.localeCompare(gB);
                return (a.displayNumber || 99999) - (b.displayNumber || 99999);
            }
            if (self._sortBy === 'stats') {
                var sA = typeof calculateQuestionStats === 'function' ? calculateQuestionStats(a.questionId) : null;
                var sB = typeof calculateQuestionStats === 'function' ? calculateQuestionStats(b.questionId) : null;
                return (sA ? sA.percentage : 999) - (sB ? sB.percentage : 999);
            }
            return (a.displayNumber || 99999) - (b.displayNumber || 99999);
        });
    },
    
    _getGroups(allQ) {
        var map = {};
        allQ.forEach(function(q) { var g = q._fileGroup || 'Manuell'; map[g] = (map[g] || 0) + 1; });
        return Object.keys(map).sort().map(function(n) { return { name: n, count: map[n] }; });
    },
    
    _countDuplicates(allQ) {
        var seen = new Set();
        var dupes = 0;
        allQ.forEach(function(q) {
            var key = (q.text || '').trim().toLowerCase();
            if (seen.has(key)) dupes++;
            else seen.add(key);
        });
        return dupes;
    },
    
    _removeDuplicates() {
        var seen = new Set();
        var before = questions.length;
        var kept = [];
        questions.forEach(function(q) {
            var key = (q.text || '').trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                kept.push(q);
            }
        });
        questions.length = 0;
        kept.forEach(function(q) { questions.push(q); });
        var removed = before - questions.length;
        Toast.show(removed + ' Duplikat(e) entfernt! (' + questions.length + ' Fragen übrig)', 'success');
        this.render();
    },
    
    _toggleActive(qId) {
        var q = questions.find(function(qq) { return qq.id === qId; });
        if (q) { q.active = (q.active === false) ? true : false; this._renderList(); }
    },
    
    _toggleExpand(qId) {
        if (this._expandedCards.has(qId)) this._expandedCards.delete(qId);
        else this._expandedCards.add(qId);
        this._renderList();
    },
    
    _delete(qId) {
        var q = questions.find(function(qq) { return qq.id === qId; });
        if (!q) return;
        if (!confirm('Frage #' + (q.displayNumber || '?') + ' löschen?\n\n"' + (q.text || '').substring(0, 80) + '..."')) return;
        var idx = questions.indexOf(q);
        if (idx > -1) questions.splice(idx, 1);
        this._renderList();
        Toast.show('Frage gelöscht.', 'info');
    },
    
    _preview(qId) {
        var q = questions.find(function(qq) { return qq.id === qId; });
        if (!q) return;
        var mediaSrc = typeof getMediaSource === 'function' ? getMediaSource(q.media) : null;
        var qType = q.type || 'multiple-choice';
        
        var h = '<div class="f2-preview-overlay" onclick="if(event.target===this)Fragen2Plugin._closePreview()">';
        h += '<div class="f2-preview-card">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
        h += '<span style="font-size:0.8rem;opacity:0.5;">Vorschau</span>';
        h += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._closePreview()">✕</button>';
        h += '</div>';
        
        if (this._showImages && q.media && mediaSrc) {
            if (q.media.type === 'image') h += '<img src="' + mediaSrc + '" style="width:' + this._imgDisplayWidth + 'px;max-width:100%;height:auto;object-fit:contain;border-radius:12px;margin-bottom:20px;" onerror="this.style.display=\'none\'">';
            else if (q.media.type === 'video') h += '<video src="' + mediaSrc + '" controls style="width:100%;max-height:300px;border-radius:12px;margin-bottom:20px;"></video>';
        }
        
        h += '<h3 style="font-size:1.3rem;margin-bottom:20px;line-height:1.5;">' + sanitizeHTML(q.text || '') + '</h3>';
        
        if (qType === 'multiple-choice' && q.answers) {
            h += '<div style="display:flex;flex-direction:column;gap:10px;">';
            q.answers.forEach(function(a, i) {
                var letter = String.fromCharCode(65 + i);
                h += '<div style="padding:14px 18px;border-radius:12px;border:2px solid ' + (a.correct ? 'var(--correct)' : 'rgba(255,255,255,0.15)') + ';background:' + (a.correct ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.05)') + ';display:flex;align-items:center;gap:12px;">';
                h += '<span style="font-weight:700;opacity:0.5;">' + letter + '</span>';
                h += '<span>' + sanitizeHTML(a.text || '') + '</span>';
                if (a.correct) h += '<span style="margin-left:auto;color:var(--correct);">✓</span>';
                h += '</div>';
            });
            h += '</div>';
        } else if (qType === 'text') {
            h += '<div style="padding:14px 18px;border-radius:12px;border:2px dashed rgba(255,255,255,0.2);background:rgba(255,255,255,0.03);">';
            h += '<span style="opacity:0.4;">Freitext-Eingabefeld...</span></div>';
            var ta = typeof getCorrectTextAnswers === 'function' ? getCorrectTextAnswers(q) : [];
            if (ta && ta.length > 0) {
                h += '<div style="margin-top:10px;font-size:0.85rem;opacity:0.7;">Akzeptiert: ';
                (Array.isArray(ta) ? ta : [ta]).forEach(function(a) {
                    h += '<span style="background:rgba(46,204,113,0.15);padding:2px 8px;border-radius:4px;margin:0 3px;color:#2ecc71;">' + sanitizeHTML(a) + '</span>';
                });
                h += '</div>';
            }
        } else if (qType === 'imagemap') {
            h += '<div style="padding:20px;text-align:center;opacity:0.5;border:2px dashed rgba(255,255,255,0.1);border-radius:12px;">🗺️ Bildklick — ' + (q.targets ? q.targets.length : 0) + ' Zone(n)</div>';
        }
        
        h += '</div></div>';
        var overlay = document.createElement('div');
        overlay.id = 'f2PreviewOverlay';
        overlay.innerHTML = h;
        document.body.appendChild(overlay);
    },
    
    _closePreview() {
        var el = document.getElementById('f2PreviewOverlay');
        if (el) el.remove();
    },
    
    // ══════════════════════════════════════
    // BATCH & AKTIONEN
    // ══════════════════════════════════════
    _parseBatch(input) {
        var nums = [];
        input.split(',').map(function(s) { return s.trim(); }).forEach(function(part) {
            if (part.includes('-')) {
                var range = part.split('-').map(function(s) { return parseInt(s.trim()); });
                if (!isNaN(range[0]) && !isNaN(range[1]) && range[0] <= range[1]) {
                    for (var i = range[0]; i <= range[1]; i++) nums.push(i);
                }
            } else { var num = parseInt(part); if (!isNaN(num)) nums.push(num); }
        });
        return [...new Set(nums)];
    },
    
    _batchActivate(activate) {
        var input = document.getElementById('f2BatchInput');
        if (!input || !input.value.trim()) { Toast.show('Bitte Nummern eingeben! z.B. 5, 10-15, 20-40', 'warning'); return; }
        var nums = this._parseBatch(input.value);
        if (nums.length === 0) { Toast.show('Keine gültigen Nummern!', 'warning'); return; }
        var count = 0, notFound = [];
        nums.forEach(function(n) {
            var q = questions.find(function(qq) { return qq.displayNumber === n; });
            if (q) { q.active = activate; count++; } else { notFound.push(n); }
        });
        input.value = '';
        this._renderList();
        var msg = activate ? '✅ ' + count + ' Frage(n) aktiviert!' : '❌ ' + count + ' Frage(n) deaktiviert!';
        if (notFound.length > 0 && notFound.length <= 10) msg += '\nNicht gefunden: ' + notFound.join(', ');
        Toast.show(msg, 'success');
    },
    
    _allActivate(activate) {
        questions.forEach(function(q) { q.active = activate; });
        this._renderList();
        this.render();
        Toast.show(activate ? '✅ Alle ' + questions.length + ' Fragen aktiviert!' : '❌ Alle ' + questions.length + ' Fragen deaktiviert!', 'success');
    },
    
    _invertActive() {
        questions.forEach(function(q) { q.active = (q.active === false) ? true : false; });
        var activeCount = questions.filter(function(q) { return q.active !== false; }).length;
        this._renderList();
        this.render();
        Toast.show('🔄 Umgekehrt! Jetzt aktiv: ' + activeCount + '/' + questions.length, 'info');
    },
    
    _renumber() {
        if (!confirm('Alle Fragen lückenlos 1, 2, 3, ... neu nummerieren?')) return;
        var sorted = questions.slice().sort(function(a, b) { return (a.displayNumber || 99999) - (b.displayNumber || 99999); });
        sorted.forEach(function(q, idx) { q.displayNumber = idx + 1; });
        this.render();
        Toast.show('🔢 ' + questions.length + ' Fragen neu nummeriert!', 'success');
    },
    
    _resetStats() {
        if (!confirm('Alle Fragen-Statistiken (richtig/falsch Zähler) bei allen Benutzern zurücksetzen?')) return;
        if (typeof resetQuestionStats === 'function') {
            resetQuestionStats();
        } else {
            users.forEach(function(user) { user.questionStats = {}; });
            Toast.show('📊 Statistiken zurückgesetzt!', 'success');
        }
        this._renderList();
    },
    
    _deleteAll() {
        if (!confirm('⚠️ ALLE ' + questions.length + ' Fragen unwiderruflich löschen?')) return;
        if (!confirm('Wirklich ALLE Fragen löschen? Das kann nicht rückgängig gemacht werden!')) return;
        questions.length = 0;
        this.render();
        Toast.show('🗑️ Alle Fragen gelöscht!', 'info');
    },
    
    // ── Export ──
    _buildExportQ(q) {
        var exportQ = {
            id: q.id, questionId: q.questionId, displayNumber: q.displayNumber || null,
            text: q.text, type: q.type, active: q.active !== false,
            media: q.media, explanation: q.explanation || null,
            explanationMedia: q.explanationMedia || null,
            hint: q.hint || null, hintMedia: q.hintMedia || null,
            _fileGroup: q._fileGroup || 'Manuell'
        };
        if (q.type === QUESTION_TYPES.TEXT) exportQ.correctAnswer = typeof getCorrectTextAnswers === 'function' ? getCorrectTextAnswers(q) : q.correctAnswer;
        else if (q.type === QUESTION_TYPES.IMAGEMAP) exportQ.targets = q.targets;
        else exportQ.answers = q.answers;
        return exportQ;
    },
    
    _downloadJSON(data, filename) {
        var jsonStr = JSON.stringify(data, null, 2);
        if (typeof quizSettings !== 'undefined' && quizSettings.encryptPlayerData) {
            try { jsonStr = btoa(unescape(encodeURIComponent(jsonStr))); } catch(e) {}
        }
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    _timestamp() {
        return new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
    },
    
    _exportAll() {
        var theme = prompt('Themenblock-Name für die Datei:', 'Allgemeinwissen');
        if (!theme) return;
        theme = theme.trim().replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').replace(/\s+/g, '-');
        var self = this;
        var data = {
            version: '1.0', theme: theme,
            created: new Date().toISOString(), lastModified: new Date().toISOString(),
            questions: questions.map(function(q) { return self._buildExportQ(q); })
        };
        this._downloadJSON(data, '03_questions_' + theme + '_' + this._timestamp() + '.json');
        Toast.show('📤 ' + questions.length + ' Fragen exportiert!', 'success');
    },
    
    _exportByGroup() {
        var groups = {};
        questions.forEach(function(q) { var g = q._fileGroup || 'Manuell'; if (!groups[g]) groups[g] = []; groups[g].push(q); });
        var names = Object.keys(groups);
        if (names.length <= 1) { Toast.show('Alle Fragen in einer Gruppe — nutze "Alle exportieren"', 'info'); return; }
        var self = this;
        var ts = this._timestamp();
        names.forEach(function(g) {
            var safeName = g.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').replace(/\s+/g, '-');
            var data = {
                version: '1.0', theme: g,
                created: new Date().toISOString(), lastModified: new Date().toISOString(),
                questions: groups[g].map(function(q) { return self._buildExportQ(q); })
            };
            self._downloadJSON(data, '03_questions_' + safeName + '_' + ts + '.json');
        });
        Toast.show('📤 ' + names.length + ' Gruppen-Dateien exportiert!', 'success');
    },
    
    _batchExport() {
        var input = document.getElementById('f2BatchInput');
        if (!input || !input.value.trim()) { Toast.show('Bitte Nummern-Bereich eingeben! z.B. 30-110', 'warning'); return; }
        var nums = this._parseBatch(input.value);
        if (nums.length === 0) { Toast.show('Keine gültigen Nummern!', 'warning'); return; }
        var numsSet = new Set(nums);
        var selected = questions.filter(function(q) { return numsSet.has(q.displayNumber); });
        if (selected.length === 0) { Toast.show('Keine Fragen in diesem Bereich gefunden!', 'warning'); return; }
        var rangeLabel = input.value.trim().replace(/\s+/g, '').replace(/,/g, '_');
        var self = this;
        var data = {
            version: '1.0', theme: 'Bereich_' + rangeLabel,
            created: new Date().toISOString(), lastModified: new Date().toISOString(),
            questions: selected.map(function(q) { return self._buildExportQ(q); })
        };
        this._downloadJSON(data, '03_questions_Nr' + rangeLabel + '_' + this._timestamp() + '.json');
        input.value = '';
        Toast.show('📤 ' + selected.length + ' Fragen (Nr. ' + rangeLabel + ') exportiert!', 'success');
    },
    
    // ── Import ──
    _importQuestions() {
        document.getElementById('f2ImportFile').click();
    },
    
    _handleImport(event) {
        var files = Array.from(event.target.files);
        if (!files.length) return;
        var self = this;
        var totalAdded = 0, totalDupes = 0;
        
        function processFile(file) {
            return new Promise(function(resolve) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        var raw = e.target.result;
                        // Try Base64 decode
                        try { raw = decodeURIComponent(escape(atob(raw))); } catch(ex) {}
                        var data = JSON.parse(raw);
                        var importedQuestions = data.questions || data.fragen || [];
                        var importTheme = data.theme || file.name.replace('.json', '');
                        var added = 0, dupes = 0;
                        importedQuestions.forEach(function(iq) {
                            var normalized = typeof normalizeQuestion === 'function' ? normalizeQuestion(iq) : iq;
                            normalized._fileGroup = iq._fileGroup || importTheme;
                            // Duplikat-Check
                            var isDupe = questions.some(function(eq) { return (eq.text || '').trim().toLowerCase() === (normalized.text || '').trim().toLowerCase(); });
                            if (isDupe) { dupes++; }
                            else {
                                normalized.id = Date.now() + added + Math.floor(Math.random() * 1000);
                                questions.push(normalized);
                                added++;
                            }
                        });
                        totalAdded += added;
                        totalDupes += dupes;
                    } catch(err) {
                        Toast.show('Fehler in ' + file.name + ': ' + err.message, 'warning');
                    }
                    resolve();
                };
                reader.readAsText(file);
            });
        }
        
        Promise.all(files.map(processFile)).then(function() {
            self.render();
            var msg = '📥 ' + totalAdded + ' Fragen importiert!';
            if (totalDupes > 0) msg += '\n⚠️ ' + totalDupes + ' Duplikat(e) übersprungen.';
            Toast.show(msg, 'success');
        });
        event.target.value = '';
    },
    
    // ══════════════════════════════════════
    // IMAGEMAP EDITOR
    // ══════════════════════════════════════
    _imReset() {
        this._imMode = 'circle';
        this._imPoints = [];
        this._imRadius = 5;
        this._imZones = [];
        this._imPolyFinalized = false;
        this._imDragIdx = -1;
        this._imImageSrc = null;
    },
    
    _renderImEditor(prefix, q) {
        var h = '';
        h += '<div style="margin-top:12px;padding:15px;background:rgba(155,89,182,0.08);border:2px solid rgba(155,89,182,0.25);border-radius:12px;">';
        h += '<label style="font-size:0.9rem;font-weight:700;color:#bb8fce;margin-bottom:8px;display:block;">🗺️ Imagemap-Editor</label>';
        
        // Bild-Quelle
        h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">';
        h += '<input type="text" id="f2ImgPath" placeholder="Bildpfad (z.B. medien/karte.jpg)" value="' + sanitizeHTML((q && q.media && q.media.path) || '') + '" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text);font-size:0.85rem;box-sizing:border-box;">';
        h += '<input type="file" id="f2ImgFile_' + prefix + '" accept="image/*" style="display:none;" onchange="Fragen2Plugin._imLoadFile(event)">';
        h += '<button type="button" class="btn btn-small btn-secondary" onclick="document.getElementById(\'f2ImgFile_' + prefix + '\').click()" style="white-space:nowrap;">📁 Bild</button>';
        h += '<button type="button" class="btn btn-small" onclick="Fragen2Plugin._imLoadPath()" style="white-space:nowrap;background:linear-gradient(135deg,#8e44ad,#9b59b6);">Laden</button>';
        h += '</div>';
        
        // Modus
        h += '<div style="display:flex;gap:8px;margin-bottom:8px;">';
        h += '<button class="f2-filter-btn' + (this._imMode === 'circle' ? ' active' : '') + '" onclick="Fragen2Plugin._imMode=\'circle\';Fragen2Plugin._imPoints=[];Fragen2Plugin._imPolyFinalized=false;Fragen2Plugin._imRedraw()">⭕ Kreis</button>';
        h += '<button class="f2-filter-btn' + (this._imMode === 'polygon' ? ' active' : '') + '" onclick="Fragen2Plugin._imMode=\'polygon\';Fragen2Plugin._imPoints=[];Fragen2Plugin._imPolyFinalized=false;Fragen2Plugin._imRedraw()">🔷 Polygon</button>';
        h += '</div>';
        
        // Kreis Controls
        if (this._imMode === 'circle') {
            h += '<div style="display:flex;gap:15px;align-items:center;margin-bottom:8px;">';
            h += '<label style="font-size:0.82rem;">Radius: <strong id="f2ImRadVal">' + this._imRadius + '</strong>%</label>';
            h += '<input type="range" min="1" max="15" value="' + this._imRadius + '" step="0.5" oninput="Fragen2Plugin._imRadius=parseFloat(this.value);document.getElementById(\'f2ImRadVal\').textContent=this.value;Fragen2Plugin._imRedraw()" style="flex:1;">';
            h += '</div>';
        }
        
        // Polygon Controls
        if (this._imMode === 'polygon') {
            h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">';
            h += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._imPoints.pop();Fragen2Plugin._imPolyFinalized=false;Fragen2Plugin._imRedraw()">↩ Letzten Punkt</button>';
            h += '<button class="btn btn-small btn-secondary" onclick="Fragen2Plugin._imPoints=[];Fragen2Plugin._imPolyFinalized=false;Fragen2Plugin._imRedraw()">✕ Alle Punkte</button>';
            if (this._imPoints.length >= 3 && !this._imPolyFinalized) {
                h += '<button class="btn btn-small" onclick="Fragen2Plugin._imPolyFinalized=true;Fragen2Plugin._imRedraw()" style="background:linear-gradient(135deg,#27ae60,#2ecc71);">🔷 Polygon schließen</button>';
            }
            h += '<span style="font-size:0.8rem;opacity:0.6;padding:4px;">' + this._imPoints.length + ' Punkte</span>';
            h += '</div>';
        }
        
        // Zone speichern + Liste
        h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">';
        h += '<button class="btn btn-small" onclick="Fragen2Plugin._imAddZone()" style="background:linear-gradient(135deg,#e67e22,#f39c12);">＋ Zone speichern</button>';
        h += '<span style="font-size:0.82rem;opacity:0.5;">' + this._imZones.length + ' Zonen</span>';
        h += '</div>';
        h += '<div id="f2ImZoneInfo_' + prefix + '" style="margin-bottom:8px;"></div>';
        
        // Canvas / Bild-Bereich
        h += '<div id="f2ImgArea_' + prefix + '" style="position:relative;border:2px dashed rgba(155,89,182,0.4);border-radius:12px;overflow:hidden;cursor:crosshair;min-height:100px;">';
        if (this._imImageSrc) {
            h += '<img id="f2ImgEl_' + prefix + '" src="' + this._imImageSrc + '" onclick="Fragen2Plugin._imClick(event)" style="width:100%;display:block;user-select:none;cursor:crosshair;" onerror="this.parentElement.innerHTML=\'<p style=padding:30px;text-align:center;opacity:0.5>Bild konnte nicht geladen werden</p>\'">';
        } else {
            h += '<p style="padding:40px;text-align:center;opacity:0.4;">Bild laden um Zielzonen zu definieren</p>';
        }
        h += '</div>';
        
        h += '</div>';
        return h;
    },
    
    _imClick(event) {
        if (this._imDragIdx >= 0) return;
        var img = event.target;
        if (!img || img.tagName !== 'IMG') return;
        var rect = img.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width) * 100;
        var y = ((event.clientY - rect.top) / rect.height) * 100;
        if (this._imMode === 'circle') {
            this._imPoints = [{ x: x, y: y }];
        } else {
            if (!this._imPolyFinalized) this._imPoints.push({ x: x, y: y });
        }
        this._imRedraw();
    },

    _imInitCanvas(prefix) {
        this._imRedraw();
    },
    
    _imLoadPath() {
        var pathEl = document.getElementById('f2ImgPath');
        if (!pathEl || !pathEl.value.trim()) { Toast.show('Bitte Bildpfad eingeben!', 'warning'); return; }
        this._imImageSrc = pathEl.value.trim();
        this.render();
    },
    
    _imLoadFile(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        var self = this;
        reader.onload = function(e) {
            self._imImageSrc = e.target.result;
            // Pfad vorschlagen
            var pathEl = document.getElementById('f2ImgPath');
            if (pathEl && !pathEl.value.trim()) {
                pathEl.value = 'medien/' + file.name;
            }
            self.render();
        };
        reader.readAsDataURL(file);
    },
    
    _imRedraw() {
        var prefix = this._editingId ? 'edit_' + this._editingId : 'new';
        var area = document.getElementById('f2ImgArea_' + prefix);
        if (!area) return;

        var self = this;

        // Remove old overlays
        area.querySelectorAll('.f2-im-overlay').forEach(function(el) { el.remove(); });

        // Single SVG overlay covering entire image area
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('class', 'f2-im-overlay');
        svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:20;';

        var svgContent = '';

        // Draw saved zones (green)
        this._imZones.forEach(function(zone) {
            if (zone.mode === 'circle') {
                svgContent += '<circle cx="' + zone.x + '" cy="' + zone.y + '" r="' + zone.radius + '" fill="rgba(46,204,113,0.15)" stroke="rgba(46,204,113,0.8)" stroke-width="0.4"/>';
            } else if (zone.mode === 'polygon' && zone.points && zone.points.length >= 3) {
                var pts = zone.points.map(function(p) { return p.x + ',' + p.y; }).join(' ');
                svgContent += '<polygon points="' + pts + '" fill="rgba(46,204,113,0.2)" stroke="rgba(46,204,113,0.8)" stroke-width="0.4"/>';
            }
        });

        // Draw current working shape (red)
        if (this._imMode === 'circle' && this._imPoints.length > 0) {
            var p = this._imPoints[0];
            svgContent += '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + this._imRadius + '" fill="rgba(231,76,60,0.15)" stroke="rgba(231,76,60,0.8)" stroke-width="0.4" stroke-dasharray="1,0.5"/>';
            svgContent += '<circle cx="' + p.x + '" cy="' + p.y + '" r="1" fill="#e74c3c" stroke="#fff" stroke-width="0.3"/>';
        } else if (this._imMode === 'polygon' && this._imPoints.length > 0) {
            // Lines / polygon fill
            if (this._imPoints.length > 1) {
                var pts = this._imPoints.map(function(p) { return p.x + ',' + p.y; }).join(' ');
                if (this._imPolyFinalized) {
                    svgContent += '<polygon points="' + pts + '" fill="rgba(231,76,60,0.15)" stroke="rgba(231,76,60,0.8)" stroke-width="0.4"/>';
                } else {
                    svgContent += '<polyline points="' + pts + '" fill="none" stroke="rgba(231,76,60,0.8)" stroke-width="0.4" stroke-dasharray="1,0.5"/>';
                }
            }
            // Points with numbers
            this._imPoints.forEach(function(p, i) {
                svgContent += '<circle cx="' + p.x + '" cy="' + p.y + '" r="1.2" fill="#e74c3c" stroke="#fff" stroke-width="0.25"/>';
                svgContent += '<text x="' + p.x + '" y="' + (p.y + 0.4) + '" text-anchor="middle" dominant-baseline="central" font-size="1.4" fill="#fff" font-weight="900" style="pointer-events:none;">' + (i + 1) + '</text>';
            });
        }

        svg.innerHTML = svgContent;
        area.appendChild(svg);

        // Polygon drag handles (need real DOM elements for mouse events)
        if (this._imMode === 'polygon' && this._imPoints.length > 0) {
            this._imPoints.forEach(function(p, i) {
                var handle = document.createElement('div');
                handle.className = 'f2-im-overlay';
                handle.style.cssText = 'position:absolute;width:18px;height:18px;background:transparent;border-radius:50%;transform:translate(-50%,-50%);z-index:25;cursor:move;';
                handle.style.left = p.x + '%'; handle.style.top = p.y + '%';
                handle.addEventListener('mousedown', function(ev) {
                    ev.stopPropagation();
                    self._imDragIdx = i;
                    function onMove(me) {
                        var imgEl = area.querySelector('img');
                        if (!imgEl) return;
                        var rect = imgEl.getBoundingClientRect();
                        self._imPoints[self._imDragIdx].x = Math.max(0, Math.min(100, ((me.clientX - rect.left) / rect.width) * 100));
                        self._imPoints[self._imDragIdx].y = Math.max(0, Math.min(100, ((me.clientY - rect.top) / rect.height) * 100));
                        self._imRedraw();
                    }
                    function onUp() { self._imDragIdx = -1; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                });
                area.appendChild(handle);
            });
        }

        // Update zone counter live
        var counterEl = document.getElementById('f2ImZoneInfo_' + prefix);
        if (counterEl) {
            if (this._imZones.length > 0) {
                var info = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
                this._imZones.forEach(function(z, i) {
                    var label = (i + 1) + '. ' + (z.mode === 'circle' ? 'Kreis' : 'Polygon');
                    info += '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);padding:4px 10px;border-radius:6px;font-size:0.82rem;">';
                    info += '<span style="color:var(--correct);">' + label + '</span>';
                    info += '<span onclick="Fragen2Plugin._imZones.splice(' + i + ',1);Fragen2Plugin._imRedraw()" style="cursor:pointer;color:#e74c3c;font-weight:700;margin-left:4px;" title="Zone löschen">✕</span>';
                    info += '</span>';
                });
                info += '</div>';
                counterEl.innerHTML = info;
            } else {
                counterEl.innerHTML = '';
            }
        }
    },
    
    _imAddZone() {
        if (this._imMode === 'circle' && this._imPoints.length > 0) {
            this._imZones.push({ mode: 'circle', x: Math.round(this._imPoints[0].x * 100) / 100, y: Math.round(this._imPoints[0].y * 100) / 100, radius: this._imRadius });
            this._imPoints = [];
        } else if (this._imMode === 'polygon' && this._imPoints.length >= 3) {
            this._imZones.push({ mode: 'polygon', points: this._imPoints.map(function(p) { return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 }; }), tolerance: 2 });
            this._imPoints = [];
            this._imPolyFinalized = false;
        } else {
            Toast.show('Erst einen Bereich auf dem Bild definieren!', 'warning');
            return;
        }
        this._imRedraw();
        Toast.show('Zone ' + this._imZones.length + ' gespeichert!', 'success');
    },
    
    // ── Media-Helfer ──
    _handleMediaBrowse(event, targetInputId) {
        var file = event.target.files[0]; if (!file) return;
        var fileName = file.name;
        var filePath = event.target.value || '';
        var relativePath = '';
        if (file.webkitRelativePath) {
            relativePath = 'medien/' + file.webkitRelativePath;
        } else if (filePath.toLowerCase().includes('medien')) {
            var idx = filePath.toLowerCase().lastIndexOf('medien');
            relativePath = filePath.substring(idx).replace(/\\/g, '/');
        } else {
            relativePath = 'medien/' + fileName;
        }
        var targetEl = document.getElementById(targetInputId);
        if (targetEl) targetEl.value = relativePath;
        var warnEl = document.getElementById(targetInputId + '_warn');
        if (!warnEl) {
            warnEl = document.createElement('div');
            warnEl.id = targetInputId + '_warn';
            warnEl.style.cssText = 'font-size:0.75rem;margin-top:4px;padding:6px 10px;border-radius:6px;background:rgba(247,184,1,0.15);color:#f0c040;';
            if (targetEl && targetEl.parentNode) targetEl.parentNode.after(warnEl);
        }
        warnEl.innerHTML = '⚠️ Browser zeigt keine Unterordner. Falls die Datei in einem Unterordner liegt (z.B. <code>medien/Unterordner/' + fileName + '</code>), bitte den Pfad oben manuell anpassen.';
        // Trigger live preview
        var previewId = targetInputId.replace('Media_', 'MediaPrev_').replace('Media', 'MediaPreview');
        var previewEl = document.getElementById(previewId);
        if (!previewEl) previewEl = document.getElementById('f2NewMediaPreview');
        if (previewEl && file.type.startsWith('image/')) {
            var reader = new FileReader();
            reader.onload = function(e) {
                previewEl.innerHTML = '<img src="' + e.target.result + '" style="max-width:200px;max-height:120px;border-radius:8px;border:2px solid rgba(255,255,255,0.15);object-fit:contain;"><div style="font-size:0.75rem;opacity:0.5;margin-top:3px;">✓ Pfad: ' + relativePath + '</div>';
            };
            reader.readAsDataURL(file);
        }
    },

    _liveMediaPreview(inputId, previewId) {
        var self = this;
        clearTimeout(self._livePreviewTimer);
        self._livePreviewTimer = setTimeout(function() {
            var el = document.getElementById(inputId);
            var prev = document.getElementById(previewId);
            if (!el || !prev) return;
            var path = el.value.trim();
            if (!path) { prev.innerHTML = ''; return; }
            prev.innerHTML = '<img src="' + path + '" style="max-width:200px;max-height:120px;border-radius:8px;border:2px solid rgba(255,255,255,0.15);object-fit:contain;" onerror="this.parentNode.innerHTML=\'<span style=\\\'color:#e74c3c;font-size:0.8rem;\\\'>❌ Bild nicht gefunden unter: ' + path.replace(/'/g, '') + '</span>\'"><div style="font-size:0.72rem;opacity:0.5;margin-top:2px;">✓ ' + path + '</div>';
        }, 500);
    },

    _imGetTargets() {
        var targets = JSON.parse(JSON.stringify(this._imZones));
        // Auch aktuelle (nicht gespeicherte) Zone hinzufügen
        if (this._imMode === 'circle' && this._imPoints.length > 0) {
            targets.push({ mode: 'circle', x: Math.round(this._imPoints[0].x * 100) / 100, y: Math.round(this._imPoints[0].y * 100) / 100, radius: this._imRadius });
        } else if (this._imMode === 'polygon' && this._imPoints.length >= 3) {
            targets.push({ mode: 'polygon', points: this._imPoints.map(function(p) { return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 }; }), tolerance: 2 });
        }
        return targets;
    },

    // Geometrie-Funktionen (für Imagemap-Hit-Detection im Quiz-Gameplay)
    checkImagemapHit(cx, cy, targets) {
        if (!targets || !Array.isArray(targets)) return false;
        for (const t of targets) {
            if (t.mode === 'polygon' && t.points) {
                if (this.pointInPolygon(cx, cy, t.points)) return true;
                var d = this.distToPolygon(cx, cy, t.points);
                if (d < (t.tolerance || 5)) return true;
            } else {
                var dx = cx - (t.x || 0), dy = cy - (t.y || 0), r = t.radius || 5;
                if (dx * dx + dy * dy <= r * r) return true;
            }
        }
        return false;
    },
    pointInPolygon(x, y, poly) {
        var inside = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    },
    distToPolygon(x, y, poly) {
        var min = Infinity;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var d = this.distToSegment(x, y, poly[j].x, poly[j].y, poly[i].x, poly[i].y);
            if (d < min) min = d;
        }
        return min;
    },
    distToSegment(px, py, x1, y1, x2, y2) {
        var dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
        return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2);
    },

    // Statistik-Berechnung
    calculateQuestionStats(qid) {
        var asked = 0, correct = 0;
        users.forEach(function(u) { if (u.questionStats && u.questionStats[qid]) { asked += u.questionStats[qid].asked || 0; correct += u.questionStats[qid].correct || 0; } });
        if (asked === 0) return null;
        return { totalAsked: asked, totalCorrect: correct, percentage: Math.round((correct / asked) * 100) };
    }
};
