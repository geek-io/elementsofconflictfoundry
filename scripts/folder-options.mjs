export function folderOptions(folders, type) {
  const all = folders.filter((f) => f.type === type && f.visible !== false),
    ids = new Set(all.map((f) => f.id));
  const parent = (f) => {
    const value = f.folder ?? f.parent;
    return typeof value === 'string' ? value : value?.id;
  };
  const result = [],
    seen = new Set();
  const visit = (id, depth, path) => {
    for (const f of all
      .filter((f) => (ids.has(parent(f)) ? parent(f) : null) === id)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name))) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      const names = [...path, f.name];
      result.push({
        id: f.id,
        depth,
        path: names.join(' / '),
        label: `${'\u00a0\u00a0'.repeat(depth)}${depth ? '↳ ' : ''}${f.name}${depth ? ` (${names.slice(0, -1).join(' / ')})` : ''}`,
      });
      visit(f.id, depth + 1, names);
    }
  };
  visit(null, 0, []);
  return result;
}
