import clsx from 'clsx';
import CryptoDashboard from './CryptoDashboard';
import HelpdeskNotes from './HelpdeskNotes';
import { usePersistentState } from './lib/usePersistentState';

type View = 'crypto' | 'helpdesk';

function App() {
  const [view, setView] = usePersistentState<View>('app.view', 'crypto');

  return (
    <>
      <nav className="flex justify-end gap-1 border-b border-slate-800 bg-slate-950 px-4 py-1.5 text-xs">
        {(
          [
            ['crypto', 'Crypto dashboard'],
            ['helpdesk', 'Helpdesk notes'],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={clsx('rounded-full px-3 py-1.5 font-medium', view === id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200')}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === 'crypto' ? <CryptoDashboard /> : <HelpdeskNotes />}
    </>
  );
}

export default App;
