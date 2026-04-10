#!/usr/bin/env python3
"""
Quiz-System Simulation — tools/simulate.py
1:1 Nachbau des aktuellen Codes (js/10-plugin-classic-quiz.js).
Enthält alle Fixes: consecutiveCorrect-Bonus + Cooldown-Reset.

Starten:          python3 tools/simulate.py
Szenarien-Modus:  python3 tools/simulate.py --szenarien

Settings oben in CONFIG anpassen (identisch mit Master-JSON).
"""

import random
import math
import time
import sys

# ─── Settings (identisch mit spacedRepetition-Block in Master-JSON) ───────────
CONFIG = {
    'questionsPerQuiz': 10,
    'corePercent': 70,
    'spacedRepetition': {
        'randomness': 30,           # 0-100: 0=reines SR, 100=komplett zufällig
        'streakCooldown': 48,       # Stunden Sperre nach streakThreshold korrekt
        'streakThreshold': 2,       # Korrekt in Folge bis Cooldown
        'freshQuota': 50,           # % Non-Core-Slots für neue Fragen (0=aus)
        'freshThreshold': 1,        # Frage gilt als "neu" wenn <= X gestellt
        'maxCoreFirst': 7,          # Max. Core-Fragen im 1. Quiz des Tages
        'maxCoreSubsequent': 3,     # Max. Core-Fragen in Folge-Quizzen
    }
}

# ─── Simulations-Parameter ────────────────────────────────────────────────────
TOTAL_QUESTIONS     = 380
CORE_QUESTIONS      = 80
QUIZ_COUNT          = 100
QUIZZES_PER_DAY_MIN = 1
QUIZZES_PER_DAY_MAX = 6
CORRECT_RATE_MIN    = 0.65
CORRECT_RATE_MAX    = 1.00

# ─── Fragen erstellen ─────────────────────────────────────────────────────────
def create_questions(total, core_count):
    return [
        {'questionId': f'q_{i:04d}', 'isCore': i < core_count, 'active': True}
        for i in range(total)
    ]

# ─── Score-Funktion (1:1 aus ClassicQuizPlugin.scoreQuestion) ─────────────────
# Enthält: consecutiveCorrect-Bonus (Fix 1)
def score_question(q, stats, now_ms, config):
    sr               = config['spacedRepetition']
    randomness       = sr['randomness'] / 100
    cooldown_ms      = sr['streakCooldown'] * 3600000
    streak_threshold = sr['streakThreshold']
    core_percent     = config['corePercent']

    s = stats.get(q['questionId'])
    if s:
        asked  = s.get('asked', 0)
        ratio  = (s.get('correct', 0) / asked) if asked > 0 else 0
        consec = s.get('consecutiveCorrect', 0)

        # consecutiveCorrect-Bonus (Fix 1: sticky-question-Problem)
        if consec >= 1:
            ratio = min(1.0, ratio + consec * 0.2)

        priority = max(5.0, 100 - ratio * 80)

        # Cooldown-Check (überschreibt Bonus)
        if consec >= streak_threshold and s.get('lastAsked'):
            elapsed = now_ms - s['lastAsked']
            if elapsed < cooldown_ms:
                priority = 2.0

        if asked == 0:
            priority = 90.0
    else:
        priority = 95.0

    if q['isCore']:
        priority *= (1 + core_percent / 200)

    return priority + random.random() * 100 * randomness

def pick_top(pool, n, stats, now_ms, config):
    return sorted(pool, key=lambda q: score_question(q, stats, now_ms, config), reverse=True)[:n]

# ─── Fragen-Auswahl (1:1 aus selectQuestionsForUser) ─────────────────────────
def select_questions(questions, user, count, now_ms, config):
    active  = [q for q in questions if q.get('active') is not False]
    sr      = config['spacedRepetition']
    stats   = user.get('questionStats', {})
    already_played_today = user.get('dailyQuizCount', 0) > 0

    max_core = (sr.get('maxCoreSubsequent', count) if already_played_today
                else sr.get('maxCoreFirst', count))

    core_q     = [q for q in active if q['isCore']]
    non_core_q = [q for q in active if not q['isCore']]

    core_picked    = pick_top(core_q, min(max_core, count), stats, now_ms, config)
    non_core_slots = count - len(core_picked)

    fresh_quota = sr['freshQuota'] / 100  # Prozentwert → Dezimal

    if fresh_quota > 0 and already_played_today and non_core_slots > 0:
        thresh   = sr['freshThreshold']
        fresh_nc = [q for q in non_core_q
                    if not stats.get(q['questionId'])
                    or stats[q['questionId']].get('asked', 0) <= thresh]
        old_nc   = [q for q in non_core_q
                    if stats.get(q['questionId'])
                    and stats[q['questionId']].get('asked', 0) > thresh]
        fresh_count  = min(math.floor(non_core_slots * fresh_quota), len(fresh_nc))
        old_picked   = pick_top(old_nc, non_core_slots - fresh_count, stats, now_ms, config)
        fresh_count2 = non_core_slots - len(old_picked)
        non_core_picked = pick_top(fresh_nc, fresh_count2, stats, now_ms, config) + old_picked
    else:
        non_core_picked = pick_top(non_core_q, non_core_slots, stats, now_ms, config)

    return core_picked + non_core_picked

# ─── User-Stats aktualisieren (1:1 aus submitAnswer, inkl. Cooldown-Reset-Fix) ─
# Fix 2: prevLastAsked VOR qs.lastAsked-Überschreibung merken
def update_stats(user, question, is_correct, now_ms, config):
    sr               = config['spacedRepetition']
    cooldown_ms      = sr['streakCooldown'] * 3600000
    streak_threshold = sr['streakThreshold']

    qid = question['questionId']
    qs  = user['questionStats'].setdefault(qid, {
        'asked': 0, 'correct': 0, 'consecutiveCorrect': 0, 'lastAsked': None
    })

    prev_last = qs['lastAsked']   # Fix 2: VOR Überschreibung merken!
    qs['asked'] += 1
    qs['lastAsked'] = now_ms

    if is_correct:
        qs['correct'] += 1
        prev_consec = qs.get('consecutiveCorrect', 0)
        # Fix 2: Cooldown abgelaufen? → consecutiveCorrect zurücksetzen
        if prev_consec >= streak_threshold and prev_last:
            elapsed = now_ms - prev_last
            if elapsed >= cooldown_ms:
                qs['consecutiveCorrect'] = 0
        qs['consecutiveCorrect'] = qs.get('consecutiveCorrect', 0) + 1
    else:
        qs['consecutiveCorrect'] = 0

# ─── Simulation ───────────────────────────────────────────────────────────────
def run_simulation(config=None, total_q=None, core_q=None, n_quizzes=None,
                   correct_min=None, correct_max=None,
                   qpd_min=None, qpd_max=None, seed=42):
    if config     is None: config     = CONFIG
    if total_q    is None: total_q    = TOTAL_QUESTIONS
    if core_q     is None: core_q     = CORE_QUESTIONS
    if n_quizzes  is None: n_quizzes  = QUIZ_COUNT
    if correct_min is None: correct_min = CORRECT_RATE_MIN
    if correct_max is None: correct_max = CORRECT_RATE_MAX
    if qpd_min    is None: qpd_min    = QUIZZES_PER_DAY_MIN
    if qpd_max    is None: qpd_max    = QUIZZES_PER_DAY_MAX

    random.seed(seed)
    questions = create_questions(total_q, core_q)
    user = {'questionStats': {}, 'dailyQuizCount': 0, '_lastDay': -1}

    global_ask_count            = {}
    quiz_history                = []
    total_fresh_slots_available = 0
    total_fresh_slots_filled    = 0
    cd_events                   = 0   # Anzahl ausgelöster Cooldowns
    cd_resets                   = 0   # Anzahl Cooldown-Resets (Fix 2)

    # Tagesplan
    schedule = []
    remaining, day = n_quizzes, 0
    while remaining > 0:
        per_day = min(random.randint(qpd_min, qpd_max), remaining)
        schedule.extend([day] * per_day)
        remaining -= per_day
        day += 1
    total_days = day

    base_ts = int(time.time() * 1000) - (total_days * 86400000)

    for qi, current_day in enumerate(schedule):
        now_ms = base_ts + current_day * 86400000 + qi * 3600000

        if current_day != user['_lastDay']:
            user['dailyQuizCount'] = 0
            user['_lastDay'] = current_day

        is_subsequent = user['dailyQuizCount'] > 0
        selected      = select_questions(questions, user, config['questionsPerQuiz'], now_ms, config)

        # Fresh-Slot-Tracking
        if is_subsequent:
            sr_cfg       = config['spacedRepetition']
            non_core_sel = [q for q in selected if not q['isCore']]
            fresh_slots  = math.floor(len(non_core_sel) * sr_cfg['freshQuota'] / 100)
            total_fresh_slots_available += fresh_slots
            total_fresh_slots_filled    += sum(
                1 for q in non_core_sel
                if q['questionId'] not in user['questionStats']
                or user['questionStats'][q['questionId']].get('asked', 0) == 0
            )

        correct_rate = correct_min + random.random() * (correct_max - correct_min)
        results = []
        for q in selected:
            is_correct  = random.random() < correct_rate
            qs_before   = dict(user['questionStats'].get(q['questionId'], {}))
            update_stats(user, q, is_correct, now_ms, config)
            qs_after    = user['questionStats'][q['questionId']]
            sr_cfg      = config['spacedRepetition']

            # CD ausgelöst?
            if is_correct and qs_after.get('consecutiveCorrect', 0) >= sr_cfg['streakThreshold']:
                cd_events += 1
            # CD-Reset erfolgt?
            if is_correct:
                prev_consec = qs_before.get('consecutiveCorrect', 0)
                prev_last   = qs_before.get('lastAsked')
                if prev_consec >= sr_cfg['streakThreshold'] and prev_last:
                    if (now_ms - prev_last) >= sr_cfg['streakCooldown'] * 3600000:
                        cd_resets += 1

            global_ask_count[q['questionId']] = global_ask_count.get(q['questionId'], 0) + 1
            results.append({'qid': q['questionId'], 'isCore': q['isCore'], 'correct': is_correct})

        user['dailyQuizCount'] += 1
        quiz_history.append({
            'day': current_day, 'isSubsequent': is_subsequent,
            'coreCount':    sum(1 for r in results if r['isCore']),
            'nonCoreCount': sum(1 for r in results if not r['isCore']),
            'qids':         [r['qid'] for r in results],
        })

    return {
        'questions': questions, 'user': user, 'config': config,
        'globalAskCount': global_ask_count, 'quizHistory': quiz_history,
        'totalDays': total_days,
        'totalFreshSlotsAvailable': total_fresh_slots_available,
        'totalFreshSlotsFilled':    total_fresh_slots_filled,
        'cdEvents': cd_events, 'cdResets': cd_resets,
        'nQuizzes': n_quizzes,
        'correctMin': correct_min, 'correctMax': correct_max,
    }

# ─── Analyse & Ausgabe ────────────────────────────────────────────────────────
def analyze(sim, label=''):
    questions = sim['questions']
    user      = sim['user']
    ask       = sim['globalAskCount']
    history   = sim['quizHistory']
    stats     = user['questionStats']
    config    = sim['config']
    sr        = config['spacedRepetition']

    TOTAL    = len(questions)
    CORE     = sum(1 for q in questions if q['isCore'])
    NON_CORE = TOTAL - CORE

    core_q   = [q for q in questions if q['isCore']]
    normal_q = [q for q in questions if not q['isCore']]

    never_core   = [q for q in core_q   if q['questionId'] not in ask]
    never_normal = [q for q in normal_q if q['questionId'] not in ask]

    counts        = sorted(ask.values())
    avg           = sum(counts) / len(counts) if counts else 0
    core_avg      = sum(ask.get(q['questionId'], 0) for q in core_q)   / CORE
    normal_avg    = sum(ask.get(q['questionId'], 0) for q in normal_q) / NON_CORE if NON_CORE else 0

    first_q  = [h for h in history if not h['isSubsequent']]
    subseq_q = [h for h in history if h['isSubsequent']]

    def h_avg(lst, key): return sum(h[key] for h in lst) / len(lst) if lst else 0
    core_first_avg  = h_avg(first_q,  'coreCount')
    core_sub_avg    = h_avg(subseq_q, 'coreCount')
    nc_first_avg    = h_avg(first_q,  'nonCoreCount')
    nc_sub_avg      = h_avg(subseq_q, 'nonCoreCount')
    core_total_avg  = h_avg(history,  'coreCount')

    # SR-Faktor
    answered = [{'asked': v['asked'], 'ratio': v.get('correct', 0) / v['asked']}
                for v in stats.values() if v.get('asked', 0) > 0]
    answered.sort(key=lambda x: x['ratio'])
    n          = len(answered)
    bottom     = answered[:n // 4]
    top        = answered[n * 3 // 4:]
    bottom_avg = sum(r['asked'] for r in bottom) / len(bottom) if bottom else 0
    top_avg    = sum(r['asked'] for r in top)    / len(top)    if top    else 0
    sr_factor  = bottom_avg / top_avg if top_avg else 0

    # Cooldown am Ende
    now_ms      = int(time.time() * 1000)
    cooldown_ms = sr['streakCooldown'] * 3600000
    in_cooldown = sum(
        1 for s in stats.values()
        if s.get('consecutiveCorrect', 0) >= sr['streakThreshold']
        and s.get('lastAsked') and (now_ms - s['lastAsked']) < cooldown_ms
    )

    # Cluster-Indikator: Fragen die in zwei aufeinanderfolgenden Quizzen auftauchten
    cluster_count = 0
    for i in range(1, len(history)):
        prev_ids = set(history[i-1]['qids'])
        curr_ids = set(history[i]['qids'])
        cluster_count += len(prev_ids & curr_ids)
    cluster_avg = cluster_count / (len(history) - 1) if len(history) > 1 else 0

    fresh_avail  = sim['totalFreshSlotsAvailable']
    fresh_filled = sim['totalFreshSlotsFilled']
    fresh_pct    = (fresh_filled / fresh_avail * 100) if fresh_avail else 0

    sep = '─' * 62
    title = f'  QUIZ-SYSTEM SIMULATION{" — " + label if label else ""}'
    print()
    print('═' * 62)
    print(title)
    print('═' * 62)
    print(f'  {TOTAL} Fragen ({CORE} Core, {NON_CORE} Normal) | {sim["nQuizzes"]} Quizze | {sim["totalDays"]} Tage')
    print(f'  Richtig: {sim["correctMin"]*100:.0f}–{sim["correctMax"]*100:.0f}%')
    print(f'  randomness={sr["randomness"]}%  threshold={sr["streakThreshold"]}  '
          f'cooldown={sr["streakCooldown"]}h  freshQuota={sr["freshQuota"]}%')
    print(f'  maxCoreFirst={sr["maxCoreFirst"]}  maxCoreSubsequent={sr["maxCoreSubsequent"]}')
    print()

    print(sep)
    print('1. NORMAL-FRAGEN ABDECKUNG')
    print(sep)
    normal_asked = NON_CORE - len(never_normal)
    print(f'  Gestellt:        {normal_asked} / {NON_CORE} ({normal_asked/NON_CORE*100:.1f}%)')
    print(f'  Nie gestellt:    {len(never_normal)} Normal, {len(never_core)} Core')
    print()

    print(sep)
    print('2. FRAGEN-VERTEILUNG')
    print(sep)
    for (lo, hi), lbl in [((0,0),'NIE'),((1,2),'1–2x'),((3,5),'3–5x'),((6,10),'6–10x'),((11,9999),'>10x')]:
        cnt = sum(1 for q in questions if lo <= ask.get(q['questionId'], 0) <= hi)
        print(f'  {lbl:<8} {cnt:>4} ({cnt/TOTAL*100:.1f}%)')
    print(f'  Min: {counts[0] if counts else 0}x | Max: {counts[-1] if counts else 0}x | Ø: {avg:.2f}x')
    print(f'  Core-Ø: {core_avg:.2f}x | Normal-Ø: {normal_avg:.2f}x')
    print()

    print(sep)
    print('3. CORE vs. NORMAL SLOTS PRO QUIZ')
    print(sep)
    print(f'  Gesamt:  Ø {core_total_avg:.2f} Core / {10-core_total_avg:.2f} Normal')
    print(f'  1. Quiz: Ø {core_first_avg:.2f} Core / {nc_first_avg:.2f} Normal  (maxCoreFirst={sr["maxCoreFirst"]})')
    print(f'  Folge:   Ø {core_sub_avg:.2f} Core / {nc_sub_avg:.2f} Normal  (maxCoreSubsequent={sr["maxCoreSubsequent"]})')
    print()

    print(sep)
    print('4. SPACED-REPETITION-FAKTOR')
    print(sep)
    print(f'  Schlechteste 25%: Ø {bottom_avg:.2f}x gestellt')
    print(f'  Beste 25%:        Ø {top_avg:.2f}x gestellt')
    print(f'  SR-Faktor:        {sr_factor:.2f}x  (je höher = SR wirkt stärker)')
    print()

    print(sep)
    print('5. CLUSTER-INDIKATOR')
    print(sep)
    print(f'  Gleiche Fragen in aufeinanderfolgenden Quizzen: Ø {cluster_avg:.2f}/Quiz')
    print(f'  (0 = perfekt, >2 = Cluster-Verdacht)')
    print()

    print(sep)
    print('6. COOLDOWN & RESETS')
    print(sep)
    print(f'  Cooldowns ausgelöst:     {sim["cdEvents"]}')
    print(f'  Cooldown-Resets (Fix 2): {sim["cdResets"]}')
    print(f'  Im Cooldown am Ende:     {in_cooldown} Fragen')
    print(f'  Trigger: {sr["streakThreshold"]}x korrekt → {sr["streakCooldown"]}h Sperre')
    print()

    print(sep)
    print('7. FRESH-QUOTA')
    print(sep)
    print(f'  Fresh-Slots gesamt:    {fresh_avail}')
    print(f'  Davon frisch besetzt:  {fresh_filled} ({fresh_pct:.1f}%)')
    print()

    print('═' * 62)
    print('  FAZIT')
    print('═' * 62)
    issues = []
    if len(never_normal) > 5:
        issues.append(f'⚠  {len(never_normal)} Normal-Fragen nie gestellt')
    if sr_factor < 1.5:
        issues.append(f'⚠  SR-Faktor {sr_factor:.2f} schwach — randomness senken')
    if cluster_avg > 2.0:
        issues.append(f'⚠  Cluster-Indikator {cluster_avg:.2f} hoch — randomness senken')
    if sim['cdResets'] == 0 and sim['cdEvents'] > 0:
        issues.append(f'✗  KEIN Cooldown-Reset trotz {sim["cdEvents"]} CD-Events — Fix prüfen!')
    if fresh_pct < 80 and fresh_avail > 0:
        issues.append(f'⚠  Fresh-Pool erschöpft ({fresh_pct:.0f}%)')
    if not issues:
        print('  ✓ Keine kritischen Auffälligkeiten.')
    for issue in issues:
        print(f'  {issue}')
    print()


# ─── Szenarien-Vergleich ──────────────────────────────────────────────────────
def run_szenarien():
    def cfg(randomness=30, threshold=2, cooldown=48, fresh=50, mcf=7, mcs=3):
        return {
            'questionsPerQuiz': 10, 'corePercent': 70,
            'spacedRepetition': {
                'randomness': randomness, 'streakCooldown': cooldown,
                'streakThreshold': threshold, 'freshQuota': fresh,
                'freshThreshold': 1, 'maxCoreFirst': mcf, 'maxCoreSubsequent': mcs,
            }
        }

    szenarien = [
        ('Aktuell (random=30, threshold=2)',      cfg(randomness=30, threshold=2)),
        ('Wenig Zufall (random=15, threshold=2)', cfg(randomness=15, threshold=2)),
        ('Strenger CD (random=30, threshold=3)',  cfg(randomness=30, threshold=3)),
        ('Konservativ (random=20, threshold=2)',  cfg(randomness=20, threshold=2, fresh=30)),
    ]

    print()
    print('═' * 62)
    print('  SZENARIEN-VERGLEICH — 4 Konfigurationen')
    print('═' * 62)
    print()
    hdr = f'  {"Szenario":<38} {"SR":>5} {"Cluster":>8} {"CD":>6} {"Resets":>7} {"Normal%":>8}'
    print(hdr)
    print('  ' + '─'*60)

    for name, c in szenarien:
        sim = run_simulation(config=c, total_q=380, core_q=80, n_quizzes=100, seed=42)
        stats  = sim['user']['questionStats']
        ask    = sim['globalAskCount']
        normal_q = [q for q in sim['questions'] if not q['isCore']]
        NON_CORE = len(normal_q)
        never    = sum(1 for q in normal_q if q['questionId'] not in ask)
        answered = [{'asked': v['asked'], 'ratio': v.get('correct',0)/v['asked']}
                    for v in stats.values() if v.get('asked',0) > 0]
        answered.sort(key=lambda x: x['ratio'])
        n = len(answered)
        b = answered[:n//4]; t = answered[n*3//4:]
        b_avg = sum(r['asked'] for r in b)/len(b) if b else 0
        t_avg = sum(r['asked'] for r in t)/len(t) if t else 0
        sr_f  = b_avg/t_avg if t_avg else 0

        history = sim['quizHistory']
        cluster = sum(len(set(history[i-1]['qids']) & set(history[i]['qids']))
                      for i in range(1, len(history)))
        cl_avg = cluster / (len(history)-1) if len(history) > 1 else 0

        pct = (NON_CORE - never) / NON_CORE * 100
        warn = '⚠' if sr_f < 1.5 or cl_avg > 2 or never > 5 else '✓'
        print(f'  {warn} {name:<37} {sr_f:>5.1f}x {cl_avg:>7.2f} {sim["cdEvents"]:>6} {sim["cdResets"]:>7} {pct:>7.1f}%')

    print()
    print('  Legende: SR=SR-Faktor  Cluster=Ø gleiche Fragen/Quiz  CD=Cooldowns ausgelöst')
    print()


# ─── Hauptprogramm ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if '--szenarien' in sys.argv:
        run_szenarien()
    else:
        random.seed(42)
        sim = run_simulation()
        analyze(sim)
