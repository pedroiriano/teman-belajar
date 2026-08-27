# Full Route Online Course Matrix

**Status:** Canonical through TASK-027
**Primary sources:** Techwind `html/index-course.html`; Cuba
`html/template/template/dashboard-03.html`

## Portal / Techwind

| Route family | Online Course composition | Shared enforcement |
|---|---|---|
| `/` | course hero, trust row, learning paths, topic cards, content cards, FAQ, CTA | `portal-course-hero`, `portal-course-card` |
| `/search` | inner course hero, course-style filters/results/pagination | `PageHero`, Portal controls/cards |
| `/my-learning` | learner course dashboard, metrics, continue card, course cards/progress | `portal-learning-hero`, `CourseList` |
| `/training-programs`, `/training-programs/*` | inner course hero, searchable program cards, cohort schedule, Moodle course composition, progress/provenance and truthful CTA | `PageHero`, Portal course/state/progress primitives |
| `/microlearning`, `/microlearning/*` | inner course hero, format/duration cards, editorial reading/video surface, bookmark, lightweight resume, related content and Portal provenance | `PageHero`, Portal course/card/state primitives |
| `/knowledge`, `/knowledge/topics/*` | inner course hero, hierarchy explorer, course-style article cards | `PageHero`, Portal tree/card/state primitives |
| `/knowledge/*` detail | editorial course-detail header, three-pane reading surface, related cards | explicit Techwind detail composition |
| `/news`, `/announcements` and detail | inner course hero, content cards, metadata and detail surface | `PageHero`, Portal card/badge/pagination |
| `/categories/*`, `/tags/*` | inner course hero and discovery cards | `TaxonomyLanding`, `PageHero` |
| `/help` | inner course hero, search card, category groups, FAQ accordion | `PageHero`, Portal form/FAQ/state primitives |
| `/notifications` | inner course hero and responsive inbox/preferences | `PageHero`, Notification primitives |
| `/sso/*` | focused boundary state; global application chrome intentionally omitted | existing bounded auth-state composition |

## Admin / Cuba

All `/dashboard/*` routes render inside `AdminShell` with
`data-cuba-template="dashboard-03"`. Shared page headers, cards, inputs,
tables, disclosures, modals, pagination, alerts, and states inherit the Cuba
Online Course visual layer.

| Route family | Cuba composition |
|---|---|
| `/dashboard` | dashboard-03 course banner, course widgets, module catalog, workflow schedule |
| statistics | page header, filter card, statistic widgets and bounded tables |
| knowledge/news/announcements | page header, toolbar, Cuba data table, pagination and states |
| create/edit routes | page header, sectioned form cards, visible labels, footer actions, Auto-Save/Media/SEO |
| hierarchy | page header, tree/workspace cards, selection and confirmation states |
| media | page header, upload/library/detail cards, policy and modal states |
| training programs | page header, discovery sidebar, composition editor, cohort schedule, Moodle course selector, workflow and degraded states |
| microlearning | page header, discovery sidebar, editorial form, Media Picker, related content, SEO, workflow and states |
| taxonomy/FAQ | page header, tabs/disclosures, progressive forms, list/filter/pagination |
| users | page header, data table, profile/role forms and server-authorized actions |
| notifications | page header, Cuba inbox, preferences and degraded states |

## Non-negotiable checks

- Do not activate `Segera` routes without their feature task.
- Do not import vendor global JS/CSS or vendor demo data.
- Portal and Admin themes remain isolated.
- Admin warning is semantic yellow; orange/amber remains forbidden.
- Representative browser QA covers both applications, themes, desktop, and
  390 px mobile; behavior-heavy drawers/modals retain keyboard acceptance.
