// Module-level store for the just-saved dream record. Written immediately
// before router.replace() so [id].tsx can read it synchronously on first
// render without relying on React context timing.
let pending: Record<string, any> | null = null;

export function setPendingDreamRecord(rec: Record<string, any>) {
  pending = rec;
}

export function consumePendingDreamRecord(id: string): Record<string, any> | null {
  if (pending && pending.id === id) {
    const rec = pending;
    pending = null; // consume once
    return rec;
  }
  return null;
}
