# "Light Upon Light" — Game Design Document

### A respectful, mission-based historical game based on the life (Sīrah) of Prophet Mohammad ﷺ

**Working title:** *Light Upon Light* (نور على نور)
**Genre:** Narrative-driven historical action-adventure (3rd-person, mission-based)
**Visual target:** Modern realistic 3D — the production fidelity people associate with *Counter-Strike 2* / AAA shooters, applied to 7th-century Arabia.
**Status:** Design document (v1)

---

## 0. Guiding principles (read first)

This game adapts a sacred religious history. Three rules are **non-negotiable** and shape every
other decision in this document.

1. **The Prophet ﷺ is never depicted.** Not his face, body, silhouette, or voice. He is present in
   every key scene through *its effect on the world and the people around you* — the way the film
   *The Message* (1976), endorsed by Al-Azhar, told the whole Sīrah without ever showing him. The
   same rule applies to the other major prophets and, by default, the Sahāba who are explicitly
   honored. (See §6 for the exact technique.)
2. **This is not a "kill game."** We borrow Counter-Strike's *graphical fidelity and polish*, not its
   deathmatch loop. The early Muslim community fought defensive battles; the game treats them as
   moments of *protection, restraint, and survival* — never score-chasing violence. Mercy is a
   mechanic (§5).
3. **Accuracy over invention.** Every mission maps to documented events from authenticated Sīrah
   sources. A standing scholarly review board signs off on script and scenes (§9). Where sources
   differ, we present the mainstream account and note differences in the Codex (§7).

> If a feature ever conflicts with rules 1–3, the feature is cut. These rules win every time.

---

## 1. Vision statement

> Walk the early path of Islam as one of the believers — from the first whispers of revelation in
> Mecca to the building of a just community in Medina — and feel *why* this message changed the
> world: through patience under persecution, honesty in trade, courage in defense, and mercy in
> victory.

The player is **not** the Prophet ﷺ. The player is a **fictional companion** — a young Meccan named
**Rāshid** (customizable) — who accepts Islam early and lives through the events of the Sīrah at the
Prophet's ﷺ side, carrying out tasks the historical companions actually did: protecting the
vulnerable, delivering messages, migrating, negotiating, and defending the community.

The emotional goal is the opposite of a shooter's: the player should finish a mission feeling
**relief, dignity, and restraint**, not a kill-count high.

---

## 2. Why "like Counter-Strike" — and where we diverge

| Borrowed from CS-tier production | Deliberately rejected from CS gameplay |
|---|---|
| Realistic PBR materials, grounded lighting, weather | Round-based deathmatch / score-per-kill |
| High-fidelity audio (footsteps, cloth, wind, crowd) | Headshot/gore feedback loops |
| Tight, readable 3rd-person controls | Buying lethal weapons as the core loop |
| Map craftsmanship & sightline design | Player-vs-player competitive ranking on violence |
| Performance on mid-range hardware | "Terrorist/Counter-terrorist" framing of any kind |

**Net:** it *looks* and *feels* as polished as a top-tier modern action game, but the verbs are
**move, protect, persuade, carry, build, defend, forgive** — not "frag."

---

## 3. The Sīrah as a mission campaign

The campaign is divided into **two acts** mirroring the two great phases of the Prophet's ﷺ life:
the **Meccan period** (patience and da'wah under persecution) and the **Medinan period** (building a
state, defense, and treaties). Below is the mission spine. Each mission lists its **historical
anchor** and its **core gameplay verb** (none of which is "kill for points").

### ACT I — MECCA: Patience & the First Light

| # | Mission | Historical anchor | Core gameplay |
|---|---|---|---|
| 1 | *The Trustworthy* | The Prophet's ﷺ reputation as **Al-Amīn**; rebuilding the Kaaba & the Black Stone dispute he resolved | Social/trade tutorial; resolve a dispute fairly |
| 2 | *The First Light* | First revelation in Cave Ḥirāʾ (experienced from outside/aftermath, never depicting the moment itself) | Exploration; witness the changed world |
| 3 | *The Whispered Word* | Secret early da'wah; the first believers (Khadijah, Abu Bakr, Ali, Bilāl) | Stealth + dialogue; protect new believers |
| 4 | *Under the Sun* | Persecution of the weak; **Bilāl's** torture and his ransom by Abu Bakr | Rescue/escort; endurance, **no retaliation allowed** |
| 5 | *The Boycott* | Social/economic boycott of Banu Hāshim in the valley | Survival/resource management; smuggle food to the besieged |
| 6 | *The Year of Sorrow* | Deaths of Khadijah & Abu Tālib; the hardship of Ṭāʾif | Narrative; emotional low point, perseverance |
| 7 | *The Pledges* | The Pledges of ʿAqabah with the people of Yathrib (Medina) | Negotiation/diplomacy minigame |

### ACT II — MEDINA: Building a Just Community

| # | Mission | Historical anchor | Core gameplay |
|---|---|---|---|
| 8 | *The Migration (Hijrah)* | The escape from Mecca; the Cave of Thawr; the journey to Medina | Stealth + traversal; evade pursuers **without killing** |
| 9 | *Brothers* | The Constitution of Medina; pairing Muhājirūn with Anṣār; building the first mosque | Community-building / settlement mechanics |
| 10 | *The Defense at Badr* | Battle of Badr — a defensive battle against great odds | Squad tactics & **protection objectives** (see §5) |
| 11 | *The Mountain (Uhud)* | Battle of Uhud — the lesson of discipline; the archers' post | Hold-the-line; consequence of breaking orders |
| 12 | *The Trench (Khandaq)* | Battle of the Trench — engineering a defense | Build/fortify the trench; siege defense |
| 13 | *The Treaty* | Treaty of Ḥudaybiyyah — apparent setback, strategic victory | Diplomacy; restraint over force |
| 14 | *The Opening of Mecca* | The Conquest of Mecca — entered with near-bloodless mercy; general amnesty | **Climax built on forgiveness, not slaughter** |
| 15 | *The Farewell* | The Farewell Sermon — equality, human rights, accountability | Reflective finale; the message delivered |

> **Design note on the battles (10–12, 14):** these are real defensive engagements and are kept, but
> reframed — objectives are *protect the line, shield the wounded, accept surrender, stop fighting
> the moment the enemy stops*. The Conquest of Mecca is intentionally the emotional peak **because**
> it is a story of amnesty, not conquest-by-massacre.

---

## 4. Core gameplay loop

A typical mission cycles through four pillars (not every mission uses all four):

1. **Da'wah & Dialogue** — branching conversations where *how* you speak (honesty, patience, calm)
   matters. Ties into the repo's existing theme of communication & influence.
2. **Stewardship & Stealth** — protect the vulnerable, carry messages/supplies, migrate, evade —
   often with a *no-violence* constraint that fails the mission if broken.
3. **Defense (when historically warranted)** — squad-based, objective-first combat focused on
   shielding others and holding ground (§5).
4. **Reflection** — after each mission, a short narrated reflection ties the event to a value
   (patience, justice, mercy, honesty) and unlocks a Codex entry (§7).

**Progression** is by *character* (Akhlāq — see §5), not by an arsenal. You don't "level up your
gun"; you deepen traits like Patience, Trustworthiness, Courage, and Generosity, which unlock
dialogue options and community outcomes.

---

## 5. The mercy & character system (the anti-"kill game" core)

This is the system that most distinguishes the game from a shooter.

- **No kill score. Ever.** There is no kill counter, no headshot reward, no killstreak. The HUD
  tracks **Protected** (people you shielded), **Restraint** (chances to harm that you declined), and
  **Trust** (community standing).
- **Defensive-only combat.** In the battle missions you cannot initiate lethal force against a
  non-combatant or a fleeing/surrendering enemy. Doing so **fails the objective** ("The Prophet ﷺ
  forbade the killing of non-combatants" — surfaced as an in-world rule, sourced in the Codex).
- **Mercy is mechanically rewarded.** Accepting a surrender, sparing a defeated foe, or freeing a
  captive grants **Trust** and unlocks better community/diplomacy outcomes later — directly modeling
  the amnesty at the Conquest of Mecca.
- **Akhlāq (character) tree** replaces a weapon/skill tree:
  - *Ṣabr (Patience)* — endure persecution without retaliation; unlocks calm-dialogue paths.
  - *Amānah (Trustworthiness)* — fair trade & promises kept; unlocks economic/community options.
  - *Shajāʿah (Courage)* — stand firm in defense; unlocks protection tactics.
  - *Karam (Generosity)* — feed/ransom/shelter others; unlocks alliances.
  - *ʿAdl (Justice)* — judge disputes fairly; unlocks the Constitution-of-Medina systems.

---

## 6. How we portray the Prophet ﷺ without depicting him

Proven techniques, adapted from *The Message* (1976) and modern cinematography:

- **First-person-adjacent presence.** When the Prophet ﷺ "speaks," the camera takes *his point of
  view's effect* — we see the listeners' faces, their reactions, the hush of a crowd — never him.
- **No voice.** His words are conveyed through the responses of companions ("As the Messenger of
  Allah ﷺ has taught us…") or on-screen narrated text, never a voiced actor playing him.
- **The white camel / the staff / the standard** — symbolic framing devices (as in the film) mark
  his presence in a scene without rendering him.
- **Light and negative space.** Scenes are composed so the focal point where he would be is left as
  warm light or open space — reverent, intentional, and unmistakable to the player.
- The **same protocol** governs the major prophets and, by default, the explicitly honored Sahāba;
  the scholarly board (§9) rules case-by-case.

---

## 7. The Codex (educational layer)

Every mission unlocks **Codex entries**: short, sourced explanations of the event, the people, and
the value it teaches. The Codex:

- cites mainstream Sīrah sources (Ibn Hishām/Ibn Isḥāq, al-Wāqidī where corroborated, and the
  authenticated ḥadīth collections) and **flags scholarly differences** rather than hiding them;
- includes a glossary (Hijrah, Anṣār, Muhājirūn, etc.) and a timeline;
- is reviewed by the scholarly board before shipping.

This turns the game into a **teaching tool** suitable for families, schools, and Islamic centers —
the audience most likely to embrace it.

---

## 8. Art, audio & technical direction

- **Engine:** Unreal Engine 5 (Nanite/Lumen) or Unity HDRP — either hits the "CS-tier" fidelity bar.
- **Art direction:** grounded historical realism — Meccan sandstone, the Kaaba, oasis Medina, desert
  light, period-accurate clothing/architecture vetted by historians. *No* stylized gore.
- **Audio:** rich diegetic soundscape (wind, markets, crowds, call to prayer used respectfully and
  in correct historical context), an orchestral + traditional-instrument score. **No music over
  sacred moments** unless the board approves; recitation handled with care.
- **Performance target:** 60 fps on mid-range PC/console; scalable settings — the same "runs well
  everywhere" ethos that made CS broadly playable.
- **Accessibility & localization:** Arabic (primary) + English first, then Urdu, Indonesian, Turkish,
  French; full subtitle/colorblind/remap support.

---

## 9. Governance: the scholarly review board

Non-optional. Before any public build:

- A standing board of qualified scholars (ideally spanning the major schools) reviews **script,
  scenes, Codex text, and the depiction protocol** of §6.
- A documented **escalation process** for any scene that touches doctrine.
- Public transparency about who reviewed the game and what guidance shaped it — this is how *The
  Message* earned trust, and how this project would too.

---

## 10. Audience, platform & business

- **Audience:** Muslim families, youth programs, Islamic schools and centers, and the broader
  "history/educational games" market (cf. *Assassin's Creed*'s historical-tourism appeal, minus the
  assassination fantasy).
- **Platform:** PC and console first; a lighter mobile edition later.
- **Model:** premium (paid) title — *not* ad-driven or loot-box monetized, which would clash with the
  subject. Optional school/center licensing.
- **Rating goal:** suitable for teens and families; violence kept defensive, non-gory, and contextual.

---

## 11. Risks & how the design answers them

| Risk | Mitigation |
|---|---|
| Causing religious offense | Rules §0; non-depiction §6; scholarly board §9; precedent of *The Message* |
| "Trivializing sacred history into a shooter" | No kill score; mercy mechanics §5; reflection & Codex §4/§7 |
| Historical inaccuracy | Sourced Codex §7; board sign-off §9; mainstream accounts with noted differences |
| Glorifying violence | Defensive-only combat; mission-fail on harming non-combatants; amnesty as climax |
| Backlash regardless of care | Early, transparent scholarly involvement; community advisory before launch |

---

## 12. Suggested vertical slice (first prototype to build)

Build **Mission 8 — *The Migration (Hijrah)*** as the proof-of-concept:

- showcases CS-tier environment/lighting (night-time Mecca → desert → Cave of Thawr → Medina);
- proves the **no-violence stealth** loop (evade pursuers without killing);
- demonstrates the **non-depiction technique** §6 in a high-stakes scene;
- delivers one full **Codex** unlock and one **Reflection** beat.

If the vertical slice lands emotionally *without* a single kill, the whole design is validated.

---

*Document v1. Everything here is subject to the scholarly review board (§9) and the three
non-negotiable principles (§0).*
