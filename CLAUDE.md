# SWU Inventory Manager

## File Aliases

When the user refers to **"the spec"** or **"spec file"** or **"SWU spec"**, they mean:
`F:\Projects\swu-inventory-manager\specification_documents\SWU_Application_Spec.md`

When the user refers to **"the journal"** or **"learning journal"** or **"journal entries"**, they mean the folder:
`F:\Projects\swu-inventory-manager\learning_journal`

When the user refers to **"the learning guide"** or **"learning guide"**, they mean:
`F:\Projects\swu-inventory-manager\learning_guide\SWU_Learning_Guide.md`

When the user refers to **"the CSV files"** or **"tcgcsv files"** or **"the card CSVs"**, they mean the folder:
`F:\Projects\swu-inventory-manager\tcgcsv_files`

When the user refers to **"the backlog"**, they mean:
`F:\Projects\swu-inventory-manager\specification_documents\SWU_Backlog.md`

When the user refers to **"the platform spec"**, they mean:
`F:\Projects\swu-inventory-manager\specification_documents\SWU_Platform_Spec.md`

When the user refers to **"the standard variant mapping spec"** or **"the variant mapping spec"**, they mean:
`F:\Projects\swu-inventory-manager\specification_documents\SWU_Standard_Variant_Mapping_Spec.md`

When the user refers to **"the variant exceptions report"** or **"the exceptions list"**, they mean:
`F:\Projects\swu-inventory-manager\specification_documents\swuapi_standard_variant_exceptions.md`

When the user refers to **"the application spec"**, **"the app spec"**, **"the redesign spec"**, or **"the catalog redesign spec"**, they mean:
`F:\Projects\swu-inventory-manager\specification_documents\SWU_Application_Spec.md`

When the user refers to **"the original spec"**, **"the V1 spec"**, or **"the frozen spec"**, they mean:
`F:\Projects\swu-inventory-manager\specification_documents\SWU_ClaudeCode_Spec.md`

## Authoritative Docs (where to look)

Single source of truth per domain — read the one doc, don't re-derive:
- **Application** (data model, variants, inventory, UX) → `specification_documents/SWU_Application_Spec.md`
- **Variant mechanism** → `SWU_Standard_Variant_Mapping_Spec.md` (+ current exceptions in `swuapi_standard_variant_exceptions.md`)
- **Card domain rules** → `CARD_RULES.md`
- **Platform** (auth, CI/CD, infra, security) → `SWU_Platform_Spec.md` (phase history → `SWU_Platform_Roadmap.md`)
- **Outstanding work** → `SWU_Backlog.md` (the only work registry — everything else points to a BL-ID)
- **Decisions / rationale** → `docs/decisions/` (ADRs)
- **Supporting analysis / evidence** → `specification_documents/analysis/`
- `SWU_ClaudeCode_Spec.md` is **frozen** (original V1 design) — historical reference only.

## Set Codes
| Set | Code | File prefix |
|-----|------|-------------|
| Spark of Rebellion | SOR | SparkofRebellion |
| Shadows of the Galaxy | SHD | ShadowsoftheGalaxy |
| Twilight of the Republic | TWI | TwilightoftheRepublic |
| Jump to Lightspeed | JTL | JumptoLightspeed |
| Legends of the Force | LOF | LegendsoftheForce |
| Secrets of Power | SEC | SecretsofPower |
| A Lawless Time | LAW | ALawlessTime |

## Testing

**Test disposition on schema/behavior changes.** When a change breaks existing tests, give each affected test a **deliberate disposition — port, replace, or retire** — never delete or `skip` a still-valid test just to make CI green:
- **Port** — the behavior still exists; re-express the test against the new code/schema.
- **Replace** — the behavior survives but changed; write a new test superseding the old assertion.
- **Retire** — the behavior is designed away; delete the test **with a recorded reason** tying it to the change that eliminated it.

The forbidden path is the unreasoned delete-to-go-green: abandoning a still-valid test because porting is effort silently erodes coverage. Coverage % is a floor, not proof — tests encode hard-won bug knowledge, so carry the *intent*, not just the shape. For larger rewrites, produce a disposition log (each test area → disposition + reason). See `SWU_Application_Spec.md` §8 for the worked example.
