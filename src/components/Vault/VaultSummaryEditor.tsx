import { useVaultStore } from '../../hooks/useVaultStore';
import type { SummaryVariant } from '../../types/vault';

function SummaryCard({ variant }: { variant: SummaryVariant }) {
  const remove = useVaultStore((s) => s.removeSummaryVariant);
  const update = useVaultStore((s) => s.updateSummaryVariant);

  return (
    <div className="entry-card vault-entry-card">
      <div className="entry-card-header">
        <input
          className="field-input vault-summary-label"
          value={variant.label}
          onChange={(e) => update(variant.id, 'label', e.target.value)}
          placeholder="Label (e.g. AI/ML, Backend, MLOps)"
        />
        <button className="entry-remove" onClick={() => remove(variant.id)}>Remove</button>
      </div>
      <textarea
        className="field-input vault-summary-text"
        value={variant.text}
        onChange={(e) => update(variant.id, 'text', e.target.value)}
        placeholder="Professional summary text..."
        rows={4}
      />
    </div>
  );
}

export function VaultSummaryEditor() {
  const variants = useVaultStore((s) => s.vault?.summaryVariants ?? []);
  const add = useVaultStore((s) => s.addSummaryVariant);

  return (
    <div className="form-section">
      <div className="form-section-title">
        Summary Variants
        <button onClick={add}>+ Add Variant</button>
      </div>
      {variants.map((v) => (
        <SummaryCard key={v.id} variant={v} />
      ))}
    </div>
  );
}
