#!/usr/bin/env python3
"""
Quiz-System Simulation — tools/simulate.py
Bildet die echte Auswahllogik aus ClassicQuizPlugin.selectQuestionsForUser nach.

Starten: python3 tools/simulate.py

Settings oben in CONFIG anpassen, dann neu starten.
Werte müssen identisch mit dem spacedRepetition-Block in der Master-JSON sein.
"""

import random
import math
import time

# ─── Settings (identisch mit spacedRepetition-Block in Master-JSON) ───────────
CONFIG = {
    'questionsPerQuiz': 10,
    'corePercent': 70,          # Prioritäts-Boost für Core-Fragen (%)
    'spacedRepetition': {
        'randomness': 50,           # 0-100: 0=reines SR, 100=komplett zufällig
        'streakCooldown': 48,       # Stunden Sperre nach streakThreshold korrekt
        'streakThreshold': 2,       # Korrekt in Folge bis Cooldown
        'freshQuota': 50,           # % Non-Core-Slots für neue Fragen (0=aus)
        'freshThreshold': 1,        # Frage gilt als "neu" wenn <= X gestellt
        'maxCoreFirst': 7,          # Max. Core-Fragen im 1. Quiz des Tages
        'maxCoreSubsequent': 3,     # Max. Core-Fragen in Folge-Quizzen
    }
}

# ─── Simulations-Parameter ────────────────────────────────────────────────────
TOTAL_QUESTIONS = 370
CORE_QUESTIONS  = 80
QUIZ_COUNT      = 100
QUIZZES_PER_DAY_MIN = 1
QUIZZES_PER_DAY_MAX = 6
CORRECT_RATE_MIN = 0.65
CORRECT_RATE_MAX = 1.00

# ─── Fragen erstellen ─────────────────────────────────────────────────────────
def create_questions(total, core_count):
    return [
        {'questionId': f'q_{str(i).zfill(4)}', 'isCore': i < core_count, 'active': True}
        for i in range(total)
    ]

# ─── Score-Funktion (1:1 aus ClassicQuizPlugin.selectQuestionsForUser) ────────
def score_question(q, stats, now_ms, config):
    sr = config['spacedRepetition']
    randomness      = sr['randomness'] / 100
    cooldown_ms     = sr['streakCooldown'] * 3600000
    streak_threshold = sr['streakThreshold']
    core_percent    = config['corePercent']

    s = stats.get(q['questionId'])
    if s:
        asked = s.get('asked', 0)
        ratio = (s.get('correct', 0) / asked) if asked > 0 else 0
        priority = max(5.0, 100 - ratio * 80)
        if (s.get('consecutiveCorrect', 0) >= streak_threshold
                and s.get('lastAsked')
                and (now_ms - s['lastAsked']) < cooldown_ms):
            priority = 2.0
        if asked == 0:
            priority = 90.0
    else:
        priority = 95.0

    if q['isCore']:
        priority *= (1 + core_percent / 200)

    return priority + random.random() * 100 * randomness

def pick_top(pool, n, stats, now_ms, config):
    scored = sorted(pool, key=lambda q: score_question(q, stats, now_ms, config), reverse=True)
    return scored[:n]

# ─── Fragen-Auswahl (identisch mit selectQuestionsForUser) ───────────────────
def select_questions(questions, user, count, now_ms, config):
    active  = [q for q in questions if q.get('active') is not False]
    sr      = config['spacedRepetition']
    stats   = user.get('questionStats', {})
    already_played_today = user.get('dailyQuizCount', 0) > 0

    max_core = (sr.get('maxCoreSubsequent', count) if already_played_today
                else sr.get('maxCoreFirst', count))

    core_q    = [q for q in active if q['isCore']]
    non_core_q = [q for q in active if not q['isCore']]

    core_picked   = pick_top(core_q, min(max_core, count), stats, now_ms, config)
    non_core_slots = count - len(core_picked)

    fresh_quota = sr['freshQuota'] / 100   # Prozentwert → Dezimal (wie im echten Code)

    if fresh_quota > 0 and already_played_today and non_core_slots > 0:
        thresh   = sr['freshThreshold']
        fresh_nc = [q for q in non_core_q
                    if not stats.get(q['questionId'])
                    or stats[q['questionId']].get('asked', 0) <= thresh]
        old_nc   = [q for q in non_core_q
                    if stats.get(q['questionId'])
                    and stats[q['questionId']].get('asked', 0) > thresh]
        fresh_count = min(math.floor(non_core_slots * fresh_quota), len(fresh_nc))
        old_picked  = pick_top(old_nc, non_core_slots - fresh_count, stats, now_ms, config)
        fresh_count2 = non_core_slots - len(old_picked)
        non_core_picked = pick_top(fresh_nc, fresh_count2, stats, now_ms, config) + old_picked
    else:
        non_core_picked = pick_top(non_core_q, non_core_slots, stats, now_ms, config)

    return core_picked + non_core_picked

# ─── User-Stats aktualisieren ─────────────────────────────────────────────────
def update_stats(user, question, is_correct, now_ms):
    qid = question['questionId']
    s = user['questionStats'].setdefault(qid, {
        'asked': 0, 'correct': 0, 'consecutiveCorrect': 0, 'lastAsked': None
    })
    s['asked'] += 1
    s['lastAsked'] = now_ms
    if is_correct:
        s['correct'] += 1
        s['consecutiveCorrect'] = s.get('consecutiveCorrect', 0) + 1
    else:
        s['consecutiveCorrect'] = 0

# ─── Simulation ───────────────────────────────────────────────────────────────
def run_simulation():
    questions = create_questions(TOTAL_QUESTIONS, CORE_QUESTIONS)
    user = {'questionStats': {}, 'dailyQuizCount': 0, '_lastDay': -1}

    global_ask_count = {}
    quiz_history     = []
    total_fresh_slots_available = 0
    total_fresh_slots_filled    = 0

    # Tagesplan: QUIZ_COUNT Quizze auf Tage verteilen
    schedule = []
    remaining, day = QUIZ_COUNT, 0
    while remaining > 0:
        per_day = min(random.randint(QUIZZES_PER_DAY_MIN, QUIZZES_PER_DAY_MAX), remaining)
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
        selected      = select_questions(questions, user, CONFIG['questionsPerQuiz'], now_ms, CONFIG)

        # Fresh-Slot-Tracking (nur Folge-Quizze)
        if is_subsequent:
            sr = CONFIG['spacedRepetition']
            non_core_sel   = [q for q in selected if not q['isCore']]
            fresh_slots    = math.floor(len(non_core_sel) * sr['freshQuota'] / 100)
            total_fresh_slots_available += fresh_slots
            total_fresh_slots_filled    += sum(
                1 for q in non_core_sel
                if q['questionId'] not in user['questionStats']
                or user['questionStats'][q['questionId']].get('asked', 0) == 0
            )

        correct_rate = CORRECT_RATE_MIN + random.random() * (CORRECT_RATE_MAX - CORRECT_RATE_MIN)
        results = []
        for q in selected:
            is_correct = random.random() < correct_rate
            update_stats(user, q, is_correct, now_ms)
            global_ask_count[q['questionId']] = global_ask_count.get(q['questionId'], 0) + 1
            results.append({'qid': q['questionId'], 'isCore': q['isCore'], 'correct': is_correct})

        user['dailyQuizCount'] += 1
        quiz_history.append({
            'day': current_day, 'isSubsequent': is_subsequent,
            'coreCount': sum(1 for r in results if r['isCore']),
            'nonCoreCount': sum(1 for r in results if not r['isCore']),
        })

    return {
        'questions': questions, 'user': user,
        'globalAskCount': global_ask_count, 'quizHistory': quiz_history,
        'totalDays': total_days,
        'totalFreshSlotsAvailable': total_fresh_slots_available,
        'totalFreshSlotsFilled': total_fresh_slots_filled,
    }

# ─── Analyse & Ausgabe ────────────────────────────────────────────────────────
def analyze(sim):
    questions    = sim['questions']
    user         = sim['user']
    ask          = sim['globalAskCount']
    history      = sim['quizHistory']
    stats        = user['questionStats']
    sr           = CONFIG['spacedRepetition']

    TOTAL    = len(questions)
    CORE     = sum(1 for q in questions if q['isCore'])
    NON_CORE = TOTAL - CORE

    core_q    = [q for q in questions if q['isCore']]
    normal_q  = [q for q in questions if not q['isCore']]

    never_core   = [q for q in core_q   if q['questionId'] not in ask]
    never_normal = [q for q in normal_q if q['questionId'] not in ask]

    counts = list(ask.values())
    counts_sorted = sorted(counts)
    avg   = sum(counts_sorted) / len(counts_sorted) if counts_sorted else 0
    core_avg   = sum(ask.get(q['questionId'], 0) for q in core_q)   / CORE
    normal_avg = sum(ask.get(q['questionId'], 0) for q in normal_q) / NON_CORE if NON_CORE else 0

    first_q  = [h for h in history if not h['isSubsequent']]
    subseq_q = [h for h in history if h['isSubsequent']]
    core_first_avg   = sum(h['coreCount']    for h in first_q)  / len(first_q)  if first_q  else 0
    core_subseq_avg  = sum(h['coreCount']    for h in subseq_q) / len(subseq_q) if subseq_q else 0
    nc_first_avg     = sum(h['nonCoreCount'] for h in first_q)  / len(first_q)  if first_q  else 0
    nc_subseq_avg    = sum(h['nonCoreCount'] for h in subseq_q) / len(subseq_q) if subseq_q else 0
    core_total_avg   = sum(h['coreCount']    for h in history)  / len(history)

    # SR-Faktor
    answered = [{'qid': k, 'asked': v['asked'],
                 'ratio': v.get('correct', 0) / v['asked'] if v['asked'] else 0}
                for k, v in stats.items() if v.get('asked', 0) > 0]
    answered.sort(key=lambda x: x['ratio'])
    n = len(answered)
    bottom = answered[:n // 4]
    top    = answered[n * 3 // 4:]
    bottom_avg = sum(r['asked'] for r in bottom) / len(bottom) if bottom else 0
    top_avg    = sum(r['asked'] for r in top)    / len(top)    if top    else 0
    sr_factor  = bottom_avg / top_avg if top_avg else 0

    # Cooldown
    now_ms      = int(time.time() * 1000)
    cooldown_ms = sr['streakCooldown'] * 3600000
    in_cooldown = sum(
        1 for s in stats.values()
        if s.get('consecutiveCorrect', 0) >= sr['streakThreshold']
        and s.get('lastAsked') and (now_ms - s['lastAsked']) < cooldown_ms
    )

    fresh_avail  = sim['totalFreshSlotsAvailable']
    fresh_filled = sim['totalFreshSlotsFilled']
    fresh_pct    = (fresh_filled / fresh_avail * 100) if fresh_avail else 0

    sep = '─' * 60
    print()
    print('═' * 60)
    print('  QUIZ-SYSTEM SIMULATION')
    print('═' * 60)
    print(f'  {TOTAL} Fragen ({CORE} Core, {NON_CORE} Normal) | {QUIZ_COUNT} Quizze | {sim["totalDays"]} Tage')
    print(f'  Richtig: {CORRECT_RATE_MIN*100:.0f}–{CORRECT_RATE_MAX*100:.0f}% | {len(first_q)} erste + {len(subseq_q)} Folge-Quizze')
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
    brackets = [(0, 0), (1, 2), (3, 5), (6, 10), (11, 9999)]
    labels   = ['NIE', '1–2x', '3–5x', '6–10x', '>10x']
    for (lo, hi), label in zip(brackets, labels):
        cnt = sum(1 for q in questions if lo <= ask.get(q['questionId'], 0) <= hi)
        print(f'  {label:<8} {cnt:>4} ({cnt/TOTAL*100:.1f}%)')
    print(f'  Min: {counts_sorted[0] if counts_sorted else 0}x | Max: {counts_sorted[-1] if counts_sorted else 0}x | Ø: {avg:.2f}x')
    print(f'  Core-Ø: {core_avg:.2f}x | Normal-Ø: {normal_avg:.2f}x')
    print()

    print(sep)
    print('3. CORE vs. NORMAL SLOTS PRO QUIZ')
    print(sep)
    print(f'  Gesamt:     Ø {core_total_avg:.2f} Core / {10-core_total_avg:.2f} Normal')
    print(f'  1. Quiz:    Ø {core_first_avg:.2f} Core / {nc_first_avg:.2f} Normal   (maxCoreFirst={sr["maxCoreFirst"]})')
    print(f'  Folge:      Ø {core_subseq_avg:.2f} Core / {nc_subseq_avg:.2f} Normal   (maxCoreSubsequent={sr["maxCoreSubsequent"]})')
    print()

    print(sep)
    print('4. SPACED-REPETITION-FAKTOR')
    print(sep)
    print(f'  Schlechteste 25%: Ø {bottom_avg:.2f}x gestellt')
    print(f'  Beste 25%:        Ø {top_avg:.2f}x gestellt')
    print(f'  SR-Faktor:        {sr_factor:.2f}x (je höher, desto besser wirkt SR)')
    print()

    print(sep)
    print('5. FRESH-QUOTA-EFFEKT')
    print(sep)
    print(f'  Fresh-Slots gesamt:    {fresh_avail}')
    print(f'  Davon frisch besetzt:  {fresh_filled} ({fresh_pct:.1f}%)')
    print()

    print(sep)
    print('6. COOLDOWN (streakThreshold={})'.format(sr['streakThreshold']))
    print(sep)
    print(f'  Fragen im Cooldown am Ende: {in_cooldown}')
    print(f'  Trigger: {sr["streakThreshold"]}x korrekt → {sr["streakCooldown"]}h Sperre')
    print()

    print('═' * 60)
    print('  FAZIT')
    print('═' * 60)
    issues = []
    if len(never_normal) > 5:
        issues.append(f'⚠  {len(never_normal)} Normal-Fragen nie gestellt — maxCoreFirst/Subsequent prüfen')
    if sr_factor < 1.5:
        issues.append(f'⚠  SR-Faktor {sr_factor:.2f} schwach — randomness senken (aktuell {sr["randomness"]}%)')
    if fresh_pct < 80 and fresh_avail > 0:
        issues.append(f'⚠  Fresh-Pool erschöpft ({fresh_pct:.0f}%) — freshThreshold erhöhen')
    if not issues:
        print('  ✓ Keine kritischen Auffälligkeiten.')
    for issue in issues:
        print(f'  {issue}')
    print()


# ─── Hauptprogramm ────────────────────────────────────────────────────────────
if __name__ == '__main__':
    random.seed(42)
    sim = run_simulation()
    analyze(sim)
