const metadata = {
  type: 'jutsuType',
  techniquetype: 'jutsuType',
  nature: 'nature',
  element: 'nature',
  rank: 'jutsuRank',
  chakracost: 'chakraCost',
  duration: 'duration',
  actioncost: 'actionCost',
  actiontype: 'actionType',
  range: 'range',
  criticalsuccess: 'criticalSuccess',
  criticalfailure: 'criticalFailure',
  supremesuccess: 'sublimeSuccess',
  supremefailure: 'sublimeFailure',
  sublimesuccess: 'sublimeSuccess',
  sublimefailure: 'sublimeFailure',
};
export function cleanTechniqueDescription(system) {
  const html = String(system.description ?? '');
  return html
    .replace(/<h([1-6])[^>]*>([^<]+)<\/h\1>([\s\S]*?)(?=<h[1-6]\b|$)/gi, (full, level, label, body) => {
      const key = label.toLowerCase().replace(/[^a-z]/g, ''),
        field = metadata[key];
      if (field && system[field] !== undefined && system[field] !== null && system[field] !== '') return '';
      return /^(effect|description)$/.test(key) ? body : full;
    })
    .trim();
}
