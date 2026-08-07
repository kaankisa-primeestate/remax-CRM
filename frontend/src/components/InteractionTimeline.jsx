import { INTERACTION_TYPES } from '../api/customers';

function formatTimestamp(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InteractionTimeline({ interactions }) {
  if (!interactions || interactions.length === 0) {
    return (
      <div className="empty-state">Henüz görüşme kaydı yok. İlk görüşmeyi ekleyin.</div>
    );
  }

  return (
    <div className="ledger">
      {interactions.map((entry) => {
        const label =
          INTERACTION_TYPES.find((t) => t.value === entry.type)?.label ?? entry.type;
        return (
          <div className="ledger__entry" key={entry.id}>
            <div className="ledger__timestamp">{formatTimestamp(entry.occurredAt)}</div>
            <div className="ledger__body">
              <div className="ledger__type">{label}</div>
              <div className="ledger__notes">{entry.notes}</div>
              {entry.actionItems && (
                <div className="ledger__action-items">Aksiyon: {entry.actionItems}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
