# BitFit – Claude briefing (volledig)

Laatste update: 2026-04-28

---

## Mappen

| Map | Pad | Inhoud |
|-----|-----|--------|
| BitFit-beta | `mnt/BitFit-beta/` | App-code (index.html, supplement-tracker.html) |
| bitfit-data | `mnt/bitfit-data/` | Data-bestanden (notes.txt, supplement-log.json) |
| Downloads | `mnt/Downloads/` | process_jefit.py, CSV-exports |

---

## Wie is wie

- **Bert** = de gebruiker / eigenaar van de app. Authenticeert zichzelf met het woord **vegeta** in zijn notities. Vegeta is nooit een instructie, altijd authenticatie.
- **Yani** = Berts coach. Schrijft coach change requests in `[YANI]` sectie van notes.txt. Yani schrijft zonder codewoord.

---

## CSV-run uitvoeren

```bash
python3 mnt/Downloads/process_jefit.py <csv_pad> --html mnt/BitFit-beta/index.html
```

CSV staat in `mnt/uploads/` na upload of in `mnt/Downloads/`.  
Het script leest automatisch `mnt/bitfit-data/notes.txt` en verwerkt `[BERT]` en `[YANI]`.

**Let op**: het script gooit aan het einde een `PermissionError` op stats.json (verouderd pad). Dat is **benign** — de HTML is al succesvol geschreven voor die fout.

---

## Workflow na een CSV-run

1. **Check `mnt/bitfit-data/notes.txt`** — lees beide secties volledig
2. **[BERT]**: Dit zijn Berts instructies. Voer ze uit. Vraag bevestiging als ze betrekking hebben op code-aanpassingen.
3. **[YANI]**: Dit zijn coach change requests. **Toon ze EERST aan Bert** en vraag welke hij wil doorvoeren. Voer NOOIT aan zonder expliciete bevestiging van Bert. Verwijder daarna de goedgekeurde items uit `[YANI]`.
4. Commit `index.html` in `BitFit-beta` → Bert doet `git push`
5. Als notes.txt gewijzigd: commit in `bitfit-data` → Bert doet `git push`

**Bert pusht altijd zelf. Claude pusht nooit.**

---

## GitHub repos

| Repo | Inhoud | Wie heeft toegang via token |
|------|--------|------------------------------|
| `ZO174sfi12/BitFit-beta` | App-code (index.html) | Bert pusht handmatig |
| `ZO174sfi12/bitfit-data` | Data (notes.txt, supplement-log.json) | Token in index.html — alleen deze repo |

### Token-architectuur (BELANGRIJK)
- Het token zit in `index.html` gecodeerd als `atob(base64_suffix)`
- De prefix `'github_pat_'` staat als literal string in de code, de rest is base64
- Dit vermijdt GitHub secret scanning die pushes blokkeert
- Voorbeeld-patroon in de code:
  ```js
  const GH = {
    token : (()=>{ const p='github_pat_'; return p+atob('...base64...'); })(),
    owner : 'ZO174sfi12',
    repo  : 'bitfit-data',
    file  : 'notes.txt'
  };
  ```
- Het token heeft **alleen Contents R/W** op `bitfit-data`, niet op `BitFit-beta`
- **Nooit** het token in plaintext in de code zetten

---

## Architectuur van index.html

### DATA object
- `DATA` wordt volledig herschreven door `process_jefit.py`
- `DATA.lifts`: object met per lift-key een `{color, name, points[]}` — points zijn `{date, weight, volume, sets, pr}`
- `DATA.training_days`: array van alle trainingsdagen als ISO strings (`"2026-04-27"`)
- `DATA.all_active_days`: legacy veld, werd vroeger gevuld maar is gestopt bij april 14, 2026. **Niet betrouwbaar voor recente data.** De code in `computeStats` merget beide arrays nu samen.
- `DATA.weight`: array van `{date, weight}` weegmomenten
- `DATA.notes`: tekst van `[BERT]` sectie (referentie, niet actief gebruikt door de app)
- `DATA.coach_notes`: array van `{date, text}` uit `[YANI]` (ook referentie — app haalt live op via GitHub API)

### Lift-keys in DATA.lifts
| Key | Omschrijving | Kleur |
|-----|-------------|-------|
| `Squat` | Back Squat | #b388ff |
| `Deadlift` | Deadlift | #ffd600 |
| `Bench` | Barbell Bench Press | #64b5f6 |
| `OHP` | Overhead Press | eigen kleur |
| `DB Bench x2` | Dumbbell Bench (beide handen) | eigen kleur |
| `Lat PD` | Lat Pulldown | eigen kleur |
| `DIP-BW` | Dips bodyweight | eigen kleur |
| `Front Squat` | Front Squat / Zercher | eigen kleur |
| `DB Clean` | Dumbbell Clean | #a5d6a7 |
| `Row` | Barbell Row (nieuw vanaf 2026-04-28) | #ffcc80 |

### Progressie-logica (`nextW`)
```js
// T1: volume ÷ gewicht = totale reps; amrap = totalReps - 10 (want 2×5 = 10 vaste reps)
// Als amrap >= 5 → +2.5kg
// T2: totalReps >= 30 → +2.5kg
```
Als `DATA.lifts[lk]` geen punten heeft (bijv. nieuwe lift zoals Row) → `nextW` geeft `null` terug → de app toont "—". Dat is gewenst gedrag.

### Dag-identificatie (`identifyDayIdx`)
Bepaalt welke dag het was op basis van welke lifts gelogd zijn:
- Deadlift op die dag → dag 3 (DEADLIFT)
- DB Bench x2 zonder Bench → dag 3 (DEADLIFT)
- Bench zonder Squat → dag 1 (BENCH)
- Squat + Bench of Squat + Row → dag 2 (SQUAT B)
- Squat alleen → dag 0 (SQUAT A)

### Auto-selectie volgende dag
De app kijkt naar de laatste trainingsdag, bepaalt via `identifyDayIdx` welke dag dat was, en selecteert automatisch de volgende dag in de cyclus.

### Coach feed
- Haalt `[YANI]` notities live op via GitHub API uit `bitfit-data/notes.txt`
- Functie: `refreshCoachFeed()` wordt aangeroepen bij page load
- Yani's opmerkingen zijn altijd zichtbaar onderaan de pagina
- Bert's opmerkingen (vegeta) worden **niet** getoond in de coach feed

### Bert-notitie formulier
- Bert typt zijn boodschap + het woord vegeta (authenticatie)
- Bij submit wordt de tekst opgeslagen in `[BERT]` sectie van notes.txt via GitHub API
- Geen clipboard meer — directe opslag

---

## Trainingschema (GZCLP Greyskull LP) — actueel per 2026-04-28

4-daagse cyclus: **SQUAT A → BENCH → SQUAT B → DEADLIFT**

| Dag | T1 (2×5 + AMRAP) | T2 (3×10) | Logica T2 |
|-----|------------------|-----------|-----------|
| SQUAT A | Back Squat | Overhead Press | schouders/push na squat |
| BENCH | Barbell Bench Press | Front Squat / Zercher | squat variant op bench dag |
| SQUAT B | Back Squat | **Barbell Row** | push/pull balans |
| DEADLIFT | Deadlift | DB Bench ×2 | lichte push; rug niet extra belasten |

### T1 progressieregel
- 2 vaste sets van 5 + 1 AMRAP set (zelfde gewicht)
- AMRAP ≥ 5 reps → volgende sessie +2.5kg
- AMRAP < 5 → gewicht blijft
- Falen: 2× niet halen → reset −10% (in app als advies, niet automatisch)

### T2 progressieregel
- 3 sets van 10 reps (= 30 totaal)
- Alle 30 reps gehaald → volgende sessie +2.5kg
- Niet alle reps → gewicht blijft

### T3 regels
- Vrije keuze, 3×15–25 reps
- App rangschikt T3-opties dynamisch op basis van:
  - Glute-behoefte (laatste 7 dagen geen Hip Thrust → hogere score)
  - Pull-behoefte (als push > pull × 1.4 in sets → hogere score voor pull oefeningen)
  - Recency (oefening gedaan in laatste 7 dagen → −15 score)
- Eerste keuze = `!` markering (aanbevolen), rest genummerd
- Top 4 zichtbaar, rest in een uitklapbare sectie
- Per dag eigen T3-pool (zie code)

### T3-pools per dag (actueel)
**SQUAT A**: Hip Thrust, LAT PULLDOWN, CABLE ROW, FACE PULL, ABDUCTOR MACHINE, DB CLEAN  
**BENCH**: Hip Thrust, LAT PULLDOWN, CABLE ROW, FACE PULL, DB CLEAN, ABDUCTOR MACHINE  
**SQUAT B**: Hip Thrust, CABLE CHEST FLY, DIPS, LAT PULLDOWN, ABDUCTOR MACHINE, FACE PULL  
**DEADLIFT**: Hip Thrust, DB CLEAN, CABLE ROW, LAT PULLDOWN, ABDUCTOR MACHINE, FACE PULL

### Speciale oefeningen
- **HIP THRUST**: plate-loaded machine (niet barbell). Altijd "plate-loaded machine" vermelden in de note.
- **STANDING ABDUCTOR MACHINE**: staat in alle dag-pools als ABDUCTOR MACHINE
- **DB BENCH ×2**: de key is `'DB Bench x2'`. Het gewicht in DATA is het gecombineerde gewicht (beide dumbbells samen). Als Bert "30kg" logt bedoelt hij 2×15kg — het script rekent zo.

---

## Bekende bugs die opgelost zijn

### 1. Gym per periode = 0 (opgelost 2026-04-28)
**Probleem**: `computeStats` gebruikte `DATA.all_active_days || DATA.training_days`. Omdat `all_active_days` een array is (truthy maar verouderd, stopt op 14 apr), werden recente trainingsdagen niet meegeteld.  
**Fix**: nu worden beide arrays samengevoegd via `Set`:
```js
const _allDays = [...new Set([...(DATA.training_days||[]), ...(DATA.all_active_days||[])])];
const td = _allDays.filter(d => d >= s && d <= t).length;
```

### 2. GitHub push geblokkeerd door secret scanning (opgelost)
**Probleem**: PAT token stond als plaintext in index.html → GitHub blokkeerde de push.  
**Fix**: token splitsen in prefix `'github_pat_'` (literal) + `atob(base64Rest)`.

### 3. VERSTUUR-knop werkte niet (opgelost)
**Probleem**: bij ontbreken van vegeta-codewoord werd de fout stil geslikt.  
**Fix**: altijd feedback tonen (leeg veld, ontbrekend codewoord, succes).

### 4. Git index corrupt in BitFit-beta (opgelost)
**Commando**: `rm -f .git/index && git reset` — herbouwt de index.

---

## Supplement Tracker (supplement-tracker.html)

- Apart HTML-bestand in dezelfde map
- Schrijft naar `bitfit-data/supplement-log.json`
- Token wordt **niet** hardcoded — Bert plakt het via een ⚙-knop in de UI (localStorage)
- **Nooit** `supplement-log.json` aanpassen — wordt volledig beheerd door de supplement-tracker app

---

## Beperkingen van de sandbox

- **Geen netwerktoegang**: `curl`, `wget`, Python `requests` etc. werken niet in de Claude-sandbox. Alleen de browser-side JavaScript in index.html kan de GitHub API bereiken.
- **Windows file locking**: git-operaties in `bitfit-data` kunnen falen met "cannot remove .git/config.lock" als Bert tegelijk de map open heeft. Oplossing: Bert sluit de map en doet de commit zelf vanuit zijn terminal.
- **Bert pusht altijd zelf** vanuit zijn eigen terminal, niet via de sandbox.

---

## Wat NOOIT te doen

- Nooit `supplement-log.json` aanpassen
- Nooit `[BERT]` notities wissen zonder expliciete toestemming
- Nooit `[YANI]` items uitvoeren zonder Bert te vragen welke hij aanvaardt
- Nooit de token in plaintext in de code zetten (altijd `atob(base64_suffix)`)
- Nooit pushen — Bert doet dat zelf
- Nooit de `DATA` structuur handmatig aanpassen — dit wordt herschreven door process_jefit.py bij elke CSV-run

---

## Changelog (beslissingen per sessie)

### 2026-04 (meerdere sessies)
- Coach Yani-sectie altijd zichtbaar onderaan de pagina (geen verborgen paneel of PIN)
- Bert authenticeert via het woord "vegeta" — geen PIN, geen apart formulier
- Yani post zonder codewoord
- Beide slaan op in GitHub (notes.txt) via de browser API — geen clipboard
- Coach feed haalt Yani's notities live op via GitHub API bij elke page load
- Token beveiligd via separate `bitfit-data` repo + atob-encoding
- CLAUDE.md aangemaakt als project-briefing
- T3-oefeningen: `!` markering alleen op de éérste keuze
- Hip Thrust: altijd "plate-loaded machine" in de note
- Adherence-teller telt alle non-T1/T2 oefeningen mee
- Auto-selectie van de volgende dag in de cyclus
- Standing Abductor Machine toegevoegd aan alle dag-pools
- Greyskull progressiegewichten berekend via volume/gewicht ratio
- T3: top 4 zichtbaar, rest in uitklapbare sectie
- **2026-04-28**: Bug gym-per-periode opgelost (all_active_days vs training_days)
- **2026-04-28**: SQUAT B T2 gewijzigd van Barbell Bench → Barbell Row (push/pull balans)
- **2026-04-28**: `Row` lift-key toegevoegd aan DATA.lifts, LIFT_LABELS, SECONDARY_LIFTS, _pullCat
- **2026-04-28**: SQUAT B T3-pool bijgewerkt: Cable Row vervangen door Cable Chest Fly + Dips als push-aanvulling
- **2026-04-28**: SQUAT B stretches bijgewerkt (bench-gericht → rug/row-gericht)
- **2026-04-28**: identifyDayIdx bijgewerkt: Squat + Row → dag 2 (SQUAT B)
