import { Link } from 'react-router-dom';
import { Placeholder } from '../../components/Placeholder';
import { store } from '../../store';

// Owner: Vedant.
export default function Inventory() {
  return (
    <Placeholder title="Stock" owner="Vedant" todo={['Search, category, expiry, status chips', 'Manual add product']}>
      <ul className="divide-y rounded-lg border">
        {store.listProducts().map((p) => {
          const qty = store.getStock(p.id);
          return (
            <li key={p.id}>
              <Link to={`/product/${p.id}`} className="flex justify-between p-3">
                <span>{p.name}</span>
                <span className={qty <= p.minStock ? 'font-semibold text-red-600' : ''}>{qty} {p.unit}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Placeholder>
  );
}
