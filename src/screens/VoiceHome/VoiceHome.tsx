import { Placeholder } from '../../components/Placeholder';
import { store } from '../../store';

// Owner: Aditya. Primary screen — voice-first.
export default function VoiceHome() {
  const low = store.getLowStock();
  return (
    <Placeholder
      title={store.getSettings().shopName || 'DukaanBol'}
      owner="Aditya"
      todo={[
        'Big push-to-talk mic + recording indicator (src/voice)',
        'Live / final transcript',
        'Parse → ParseResult (src/nlu) → ConfirmCard or one clarifying question',
        'On confirm call store.recordSale / recordArrival, then undo toast',
        'Spoken reply + same text on screen (src/i18n)',
        'Manual / typed entry fallback',
        'Recent activity + stock alerts strip',
      ]}
    >
      <div className="flex flex-col items-center gap-3 py-6">
        <button className="h-32 w-32 rounded-full bg-brand text-5xl text-white shadow-lg" aria-label="बोला" disabled>🎤</button>
        <p className="text-sm text-stone-400">Mic — Aditya builds this</p>
      </div>
      <p className="text-sm">⚠️ Low stock right now: {low.map((x) => `${x.product.name} (${x.qty})`).join(', ') || '—'}</p>
    </Placeholder>
  );
}
