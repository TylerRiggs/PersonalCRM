import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider, defaultTheme } from '@adobe/react-spectrum';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OpportunityList from './pages/OpportunityList';
import OpportunityDetail from './pages/OpportunityDetail';
import NewOpportunity from './pages/NewOpportunity';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import { configureOpenClaw } from './api/openclaw';

function App() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setColorScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Load OpenClaw config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('openclaw_config');
    if (saved) {
      try {
        configureOpenClaw(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <Provider theme={defaultTheme} colorScheme={colorScheme}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/opportunities" element={<OpportunityList />} />
            <Route path="/opportunities/new" element={<NewOpportunity />} />
            <Route path="/opportunities/:id" element={<OpportunityDetail />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
