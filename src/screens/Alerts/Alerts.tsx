import { Placeholder } from '../../components/Placeholder';
import { store } from '../../store';

// Owner: Vedant.
export default function Alerts() {
  const exp = store.getExpiring(store.getSettings().expiryWarningDays);
  return (
    <Placeholder title="Alerts" owner="Vedant" todo={['Low stock', 'Expiry risks', 'Slow-moving items']}>
      <ul className="space-y-1 text-sm">
        {exp.map((x) => <li key={x.batch.id}>⏳ {x.batch.qty} {x.product.name} — {x.daysLeft} दिवसांत expiry</li>)}
      </ul>
    </Placeholder>
  );
}
