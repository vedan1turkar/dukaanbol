/**
 * SHARED — routing only. Change via a small PR, tell the other person.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { store, useStoreVersion } from './store';
import Onboarding from './screens/Onboarding/Onboarding';
import VoiceHome from './screens/VoiceHome/VoiceHome';
import Inventory from './screens/Inventory/Inventory';
import ProductDetail from './screens/ProductDetail/ProductDetail';
import Alerts from './screens/Alerts/Alerts';
import Procurement from './screens/Procurement/Procurement';
import Approval from './screens/Approval/Approval';
import History from './screens/History/History';

export default function App() {
  useStoreVersion();
  const onboarded = store.getSettings().onboarded;
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white shadow-sm">
      <main className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={onboarded ? <VoiceHome /> : <Navigate to="/onboarding" replace />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/approval" element={<Approval />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {onboarded && <BottomNav />}
    </div>
  );
}
