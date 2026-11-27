import { Placeholder } from '../../components/Placeholder';
import { store } from '../../store';

// Owner: Vedant.
export default function History() {
  return (
    <Placeholder title="History" owner="Vedant" todo={['Filter: sales / arrivals / corrections / approved POs', 'Show transcript + corrections linked to originals']}>
      <ul className="space-y-1 text-sm">
        {store.getHistory().slice(0, 10).map((e) => (
          <li key={e.id}>{e.type} · {store.getProduct(e.productId)?.name} · {e.qtyDelta > 0 ? '+' : ''}{e.qtyDelta}</li>
        ))}
      </ul>
    </Placeholder>
  );
}
