import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lang } from '../../contracts/types';
import { store } from '../../store';

// Owner: Vedant. Minimal working version so the app is usable; polish later.
const LANGS: { id: Lang; label: string }[] = [
  { id: 'mr', label: 'मराठी' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'hinglish', label: 'Hinglish' },
];

export default function Onboarding() {
  const s = store.getSettings();
  const [shopName, setShopName] = useState(s.shopName);
  const [lang, setLang] = useState<Lang>(s.lang);
  const [budget, setBudget] = useState(String(s.dailyBudget ?? 3000));
  const nav = useNavigate();

  return (
    <section className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-brand">DukaanBol</h1>
        <p className="text-stone-500">बोलून दुकानाचा stock सांभाळा</p>
      </div>
      <label className="block">
        <span className="text-sm font-medium">दुकानाचे नाव / Shop name</span>
        <input className="mt-1 w-full rounded-lg border p-3 text-lg" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="उदा. Shree Ganesh Kirana" />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">भाषा / Language</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button key={l.id} type="button" onClick={() => setLang(l.id)}
              className={`rounded-lg border p-3 text-lg ${lang === l.id ? 'border-brand bg-brand-light font-semibold' : ''}`}>
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium">रोजचे purchasing budget (₹)</span>
        <input className="mt-1 w-full rounded-lg border p-3 text-lg" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} />
      </label>
      <p className="text-sm text-stone-500">Demo inventory (Parle-G, Maggi, Amul Milk, Tata Salt…) आधीच loaded आहे.</p>
      <button
        className="w-full rounded-xl bg-brand p-4 text-lg font-semibold text-white disabled:opacity-40"
        disabled={!shopName.trim()}
        onClick={() => {
          store.updateSettings({ shopName: shopName.trim(), lang, dailyBudget: Number(budget) || undefined, onboarded: true });
          nav('/');
        }}
      >
        सुरू करा
      </button>
    </section>
  );
}
