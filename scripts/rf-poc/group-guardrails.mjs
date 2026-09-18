export function assertAuthorizedGroups(selections) {
  if (selections.length !== 2) throw new Error("Exactly two authorized ZIPs are required");
  const counts = Object.groupBy(selections, (selection) => selection.datasetGroup);
  if ((counts.ESTABELECIMENTOS?.length ?? 0) !== 1 || (counts.SIMPLES?.length ?? 0) !== 1) {
    throw new Error("Single-ZIP-per-group guard failed");
  }
  if (selections.some((selection) => /socios|qsa/i.test(selection.filename))) throw new Error("QSA download is forbidden");
}
