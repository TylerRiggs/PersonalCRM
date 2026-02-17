import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  View,
  Flex,
  ActionButton,
  Text,
  Heading,
  SearchField,
  Divider,
} from '@adobe/react-spectrum';
import ShowMenu from '@spectrum-icons/workflow/ShowMenu';
import Home from '@spectrum-icons/workflow/Home';
import ViewList from '@spectrum-icons/workflow/ViewList';
import Export from '@spectrum-icons/workflow/Export';
import Settings from '@spectrum-icons/workflow/Settings';
import Add from '@spectrum-icons/workflow/Add';
import { useState, useEffect, useCallback, useRef } from 'react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: <Home /> },
  { path: '/opportunities', label: 'Opportunities', icon: <ViewList /> },
  { path: '/export', label: 'Export', icon: <Export /> },
  { path: '/settings', label: 'Settings', icon: <Settings /> },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleQuickAdd = useCallback(() => {
    navigate('/opportunities/new');
  }, [navigate]);

  // Live-filter: navigate to opportunities page as user types
  const handleSearchChange = useCallback(
    (value: string) => {
      setGlobalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          navigate(`/opportunities?search=${encodeURIComponent(value.trim())}`, { replace: true });
        } else if (location.pathname === '/opportunities') {
          navigate('/opportunities', { replace: true });
        }
      }, 250);
    },
    [navigate, location.pathname]
  );

  const handleSearchClear = useCallback(() => {
    setGlobalSearch('');
    if (location.pathname === '/opportunities') {
      navigate('/opportunities', { replace: true });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + K → New Opportunity
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleQuickAdd();
      }
      // / → Focus search (when not in input)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('[data-global-search] input');
        el?.focus();
      }
      // Esc → Clear search / blur
      if (e.key === 'Escape') {
        const active = document.activeElement as HTMLElement;
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') {
          active.blur();
        }
        if (globalSearch) {
          setGlobalSearch('');
          if (location.pathname === '/opportunities') {
            navigate('/opportunities', { replace: true });
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleQuickAdd, globalSearch, location.pathname, navigate]);

  // Sync search field with URL params when navigating away
  useEffect(() => {
    if (location.pathname !== '/opportunities') return;
    const params = new URLSearchParams(location.search);
    const urlSearch = params.get('search') ?? '';
    if (urlSearch !== globalSearch) {
      setGlobalSearch(urlSearch);
    }
  }, [location.pathname, location.search]);

  return (
    <Flex direction="row" height="100vh" UNSAFE_style={{ overflow: 'hidden' }}>
      {/* Sidebar */}
      <View
        backgroundColor="gray-100"
        borderEndWidth="thin"
        borderEndColor="gray-300"
        width={sidebarCollapsed ? 'size-600' : 'size-3000'}
        UNSAFE_style={{ transition: 'width 0.2s', flexShrink: 0, overflow: 'hidden' }}
      >
        <Flex direction="column" height="100%">
          <Flex alignItems="center" justifyContent="space-between" marginX="size-150" marginY="size-100">
            {!sidebarCollapsed && (
              <Heading level={4} UNSAFE_style={{ whiteSpace: 'nowrap' }}>
                Sales CRM
              </Heading>
            )}
            <ActionButton isQuiet onPress={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <ShowMenu />
            </ActionButton>
          </Flex>
          <Divider size="S" />
          <Flex direction="column" gap="size-50" marginTop="size-100" marginX="size-50">
            {NAV_ITEMS.map((item) => (
              <ActionButton
                key={item.path}
                isQuiet
                onPress={() => navigate(item.path)}
                UNSAFE_style={{
                  justifyContent: 'flex-start',
                  background: location.pathname === item.path ? 'var(--spectrum-alias-highlight-hover)' : undefined,
                  borderRadius: '4px',
                }}
              >
                {item.icon}
                {!sidebarCollapsed && <Text>{item.label}</Text>}
              </ActionButton>
            ))}
          </Flex>
          <View flex UNSAFE_style={{ minHeight: 0 }} />
          <View marginX="size-100" marginBottom="size-200">
            <ActionButton
              width="100%"
              onPress={handleQuickAdd}
              UNSAFE_style={{ justifyContent: 'center' }}
            >
              <Add />
              {!sidebarCollapsed && <Text>New Opportunity</Text>}
            </ActionButton>
          </View>
        </Flex>
      </View>

      {/* Main content */}
      <Flex direction="column" flex UNSAFE_style={{ minWidth: 0 }}>
        {/* Top bar */}
        <View
          backgroundColor="gray-50"
          borderBottomWidth="thin"
          borderBottomColor="gray-300"
          paddingX="size-300"
          paddingY="size-100"
        >
          <Flex alignItems="center" justifyContent="space-between">
            <div data-global-search>
              <SearchField
                label="Search opportunities"
                value={globalSearch}
                onChange={handleSearchChange}
                onClear={handleSearchClear}
                onSubmit={() => {
                  if (globalSearch.trim()) {
                    navigate(`/opportunities?search=${encodeURIComponent(globalSearch.trim())}`);
                  }
                }}
                width="size-3600"
              />
            </div>
            <Flex alignItems="center" gap="size-100">
              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                ⌘K New &middot; / Search &middot; Esc Clear
              </Text>
            </Flex>
          </Flex>
        </View>

        {/* Page content */}
        <View flex paddingX="size-400" paddingY="size-300" UNSAFE_style={{ overflowY: 'auto' }}>
          <Outlet />
        </View>
      </Flex>
    </Flex>
  );
}
