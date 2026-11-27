import { useParams } from 'react-router-dom';
import { Placeholder } from '../../components/Placeholder';
import { store } from '../../store';

// Owner: Vedant.
export default function ProductDetail() {
  const { id = '' } = useParams();
  const p = store.getProduct(id);
  return (
    <Placeholder title={p?.name ?? 'Product'} owner="Vedant" todo={['Stock movements', 'Batches + expiry', 'Sales history', 'Supplier info']}>
      {p && <p>Current stock: {store.getStock(p.id)} {p.unit}</p>}
    </Placeholder>
  );
}
