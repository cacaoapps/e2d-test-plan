# Assertion CLI sketch — `scripts/assert.<ext>`

The skill ships an idea, not a one-size-fits-all script — the database layer is project-specific. The pattern is a tiny CLI that takes a check name + args + expected value and prints one short line of output.

## Shape

```
npx <runner> scripts/assert.<ext> <check-name> [args…] --eq <expected>
# OK 13
#   or
# FAIL got 10 expected 13
```

One line out. The agent reads only this line — never the underlying query.

## Firestore example (Relion stack)

```typescript
// scripts/assert.ts
import { adminDb } from '@/lib/firebase/admin'

const checks = {
  'bom-count': async (orgId: string, projectId: string) => {
    const snap = await adminDb()
      .collection('orgs').doc(orgId)
      .collection('projects').doc(projectId)
      .collection('bomNodes').count().get()
    return snap.data().count
  },
  'fmeca-entry-count': async (orgId, projectId, worksheetId) => { /* … */ },
  'calc-run-status': async (orgId, projectId, calcRunId) => { /* … */ },
  // …
}
```

## Other stacks

Same shape with the project's native query layer — `psql`, `mongo --eval`, a Prisma client, a Supabase SDK call, etc. The plan author writes the assertion CLI once at the start of the run; every plan step that needs a check references it by name. The skill produces plan steps that reference checks by name; the plan author wires the names to actual queries.
