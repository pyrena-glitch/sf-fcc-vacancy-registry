import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import {
  supabase,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  getProvider,
  createProvider,
  updateProvider,
  getVacancy,
  upsertVacancy,
  getPublicListings,
  checkElfaStatus,
} from '../../lib/supabase';
import { Provider, PublicListing } from '../../types/registry';
import { Child, CapacityConfig } from '../../types';
import { ProviderAuth } from './ProviderAuth';
import { ProviderOnboarding, ProviderFormData } from './ProviderOnboarding';
import { VacancyForm, VacancyFormData } from './VacancyForm';
import { ProviderSettings } from './ProviderSettings';
import { PublicListings } from './PublicListings';
import { AdminAddProvider } from './AdminAddProvider';
import { ChildList } from '../ChildList';
import { ChildForm } from '../ChildForm';
import { Dashboard } from '../Dashboard';
import { CsvImport } from '../CsvImport';
import { RosterSummary } from './RosterSummary';
import { LogOut, User as UserIcon, Home, Edit3, Eye, Settings, Users, BarChart3 } from 'lucide-react';
import { useLanguage, LanguageSwitcher } from '../../i18n/LanguageContext';

// Admin password - in production, use environment variable
const ADMIN_PASSWORD = 'fccasf2024';

type View = 'public' | 'auth' | 'onboarding' | 'dashboard' | 'roster' | 'projections' | 'settings' | 'admin';

export function RegistryApp() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>('public');
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [vacancyData, setVacancyData] = useState<VacancyFormData | undefined>();
  const [publicListings, setPublicListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [listingsLoading, setListingsLoading] = useState(true);

  // Roster management state
  const [children, setChildren] = useState<Child[]>([]);
  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Get capacity config from provider
  const getCapacityConfig = useCallback((): CapacityConfig => {
    if (!provider) {
      return { programType: 'small_family', totalCapacity: 8 };
    }
    return {
      programType: provider.program_type,
      totalCapacity: provider.licensed_capacity,
    };
  }, [provider]);

  // Check for admin access via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    if (adminParam === ADMIN_PASSWORD) {
      setView('admin');
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load children from localStorage for this provider
  const loadChildren = useCallback((providerId: string) => {
    const saved = localStorage.getItem(`roster_${providerId}`);
    if (saved) {
      try {
        setChildren(JSON.parse(saved));
      } catch {
        setChildren([]);
      }
    } else {
      setChildren([]);
    }
  }, []);

  // Save children to localStorage
  const saveChildren = useCallback((providerId: string, childrenData: Child[]) => {
    localStorage.setItem(`roster_${providerId}`, JSON.stringify(childrenData));
  }, []);

  // Child management functions
  const addChild = (childData: Omit<Child, 'id'>) => {
    if (!user) return;
    const newChild: Child = {
      ...childData,
      id: crypto.randomUUID(),
    };
    const updated = [...children, newChild];
    setChildren(updated);
    saveChildren(user.id, updated);
    setShowChildForm(false);
  };

  const updateChild = (id: string, childData: Omit<Child, 'id'>) => {
    if (!user) return;
    const updated = children.map(c => c.id === id ? { ...childData, id } : c);
    setChildren(updated);
    saveChildren(user.id, updated);
    setEditingChild(null);
  };

  const removeChild = (id: string) => {
    if (!user) return;
    const updated = children.filter(c => c.id !== id);
    setChildren(updated);
    saveChildren(user.id, updated);
  };

  const importChildren = (importedChildren: Omit<Child, 'id'>[]) => {
    if (!user) return;
    const newChildren = importedChildren.map(c => ({
      ...c,
      id: crypto.randomUUID(),
    }));
    const updated = [...children, ...newChildren];
    setChildren(updated);
    saveChildren(user.id, updated);
    setShowImport(false);
  };

  const clearChildren = () => {
    if (!user) return;
    setChildren([]);
    saveChildren(user.id, []);
  };

  // Check auth state on mount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isInitialLoad = true;
    let isMounted = true;

    const checkAuth = async () => {
      console.log('[Auth] Starting auth check...');

      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (isMounted && loading) {
          console.error('[Auth] Timeout - auth check took too long');
          setLoadingError('Connection timeout. Please check your internet connection and refresh.');
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[Auth] getSession completed', { hasSession: !!session, error });

        if (!isMounted) return;

        if (error) {
          console.error('[Auth] getSession error:', error);
          setLoadingError(`Auth error: ${error.message}`);
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        if (session?.user) {
          console.log('[Auth] User found:', session.user.email);
          setUser(session.user);
          await loadProviderData(session.user.id);
        } else {
          console.log('[Auth] No session found');
        }
      } catch (err) {
        console.error('[Auth] Exception during auth check:', err);
        if (isMounted) {
          setLoadingError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } finally {
        if (isMounted) {
          console.log('[Auth] Setting loading to false');
          clearTimeout(timeoutId);
          setLoading(false);
          isInitialLoad = false;
        }
      }
    };

    checkAuth();

    // Subscribe to auth changes (but skip during initial load to avoid race condition)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', event, { hasSession: !!session, isInitialLoad });

      // Skip INITIAL_SESSION event as we handle it in checkAuth
      if (event === 'INITIAL_SESSION') {
        console.log('[Auth] Skipping INITIAL_SESSION (handled by checkAuth)');
        return;
      }

      // Skip USER_UPDATED event (password change, etc.) - no need to reload data
      if (event === 'USER_UPDATED') {
        console.log('[Auth] Skipping USER_UPDATED (no data reload needed)');
        if (session?.user) {
          setUser(session.user);
        }
        return;
      }

      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        if (!isInitialLoad) {
          await loadProviderData(session.user.id);
        }
      } else {
        setUser(null);
        setProvider(null);
        setVacancyData(undefined);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Load public listings
  useEffect(() => {
    loadPublicListings();
  }, []);

  const loadProviderData = async (userId: string) => {
    console.log('[Provider] Loading provider data for:', userId);
    try {
      const providerData = await getProvider(userId);
      console.log('[Provider] getProvider result:', providerData ? 'found' : 'not found');

      if (providerData) {
        setProvider(providerData);
        loadChildren(userId);
        console.log('[Provider] Loading vacancy data...');
        const vacancy = await getVacancy(userId);
        console.log('[Provider] getVacancy result:', vacancy ? 'found' : 'not found');
        if (vacancy) {
          setVacancyData({
            infant_spots: vacancy.infant_spots,
            toddler_spots: vacancy.toddler_spots,
            preschool_spots: vacancy.preschool_spots,
            school_age_spots: vacancy.school_age_spots,
            accepting_infants: vacancy.accepting_infants,
            accepting_toddlers: vacancy.accepting_toddlers,
            accepting_preschool: vacancy.accepting_preschool,
            accepting_school_age: vacancy.accepting_school_age,
            available_date: vacancy.available_date,
            full_time_available: vacancy.full_time_available,
            part_time_available: vacancy.part_time_available,
            waitlist_available: vacancy.waitlist_available || false,
            notes: vacancy.notes || '',
          });
        }
        console.log('[Provider] Setting view to dashboard');
        setView('dashboard');
      } else {
        console.log('[Provider] No provider found, setting view to onboarding');
        setView('onboarding');
      }
    } catch (err) {
      console.error('[Provider] Exception loading provider data:', err);
      setView('onboarding');
    }
  };

  const loadPublicListings = async () => {
    setListingsLoading(true);
    try {
      const listings = await getPublicListings();
      setPublicListings(listings);
    } catch (err) {
      console.error('Failed to load listings:', err);
      setPublicListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const handleEmailAuth = async (email: string, password: string, isSignUp: boolean) => {
    const result = isSignUp
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);

    if (result.error) {
      return { error: result.error.message };
    }
    return {};
  };

  const handleGoogleAuth = async () => {
    const result = await signInWithGoogle();
    if (result.error) {
      return { error: result.error.message };
    }
    return {};
  };

  const handleOnboardingComplete = async (data: ProviderFormData) => {
    if (!user) return { error: 'Not authenticated' };

    const result = await createProvider(user.id, data);
    if (!result.error) {
      await loadProviderData(user.id);
    }
    return result;
  };

  const handleVacancySubmit = async (data: VacancyFormData) => {
    if (!user) return { error: 'Not authenticated' };

    const result = await upsertVacancy(user.id, data);
    if (!result.error) {
      setVacancyData(data);
      // Reload public listings to show updated data
      await loadPublicListings();
    }
    return result;
  };

  const handleSignOut = async () => {
    await signOut();
    setView('public');
  };

  const handleUpdateProvider = async (updates: Partial<Provider>) => {
    if (!user) return { error: 'Not authenticated' };

    const result = await updateProvider(user.id, updates);
    if (!result.error) {
      // Reload provider data to reflect changes
      await loadProviderData(user.id);
    }
    return result;
  };

  const handleReverifyElfa = async () => {
    if (!user || !provider) return;

    const isElfa = await checkElfaStatus(provider.license_number);
    await updateProvider(user.id, { is_elfa_network: isElfa });
    await loadProviderData(user.id);
  };

  // Admin view - accessible via URL ?admin=fccasf2024
  if (view === 'admin') {
    return (
      <AdminAddProvider
        onComplete={() => {
          loadPublicListings();
          setView('public');
        }}
        onCancel={() => setView('public')}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
          <p className="text-xs text-gray-400 mt-2">Check browser console for debug info</p>
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{loadingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
          <p className="text-xs text-gray-400 mt-4">Check browser console (F12) for detailed error info</p>
        </div>
      </div>
    );
  }

  // Navigation for logged-in providers
  // Desktop: top horizontal nav
  // Mobile: bottom tab bar
  const ProviderNav = () => {
    const { t } = useLanguage();
    const navItems = [
      { view: 'public' as View, icon: Eye, labelKey: 'nav.publicView' },
      { view: 'dashboard' as View, icon: Edit3, labelKey: 'nav.vacancies' },
      { view: 'roster' as View, icon: Users, labelKey: 'nav.roster' },
      { view: 'projections' as View, icon: BarChart3, labelKey: 'nav.projections' },
      { view: 'settings' as View, icon: Settings, labelKey: 'nav.settings' },
    ];

    return (
      <>
        {/* Desktop top nav - hidden on mobile */}
        <div className="hidden md:block bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {navItems.map(item => (
                <button
                  key={item.view}
                  onClick={() => setView(item.view)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    view === item.view
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={18} />
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <UserIcon size={16} />
                {provider?.business_name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <LogOut size={16} />
                {t('common.signOut')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile top bar - just shows title and sign out */}
        <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-gray-900 truncate">
            {provider?.business_name || 'Dashboard'}
          </span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="text-xs" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Mobile bottom nav - fixed at bottom */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 safe-area-bottom">
          <div className="flex justify-around items-center py-2">
            {navItems.map(item => (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`flex flex-col items-center gap-1 px-3 py-1 min-w-0 ${
                  view === item.view
                    ? 'text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                <item.icon size={20} />
                <span className="text-xs truncate">{t(item.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  };

  // Public view with option to sign in
  if (view === 'public') {
    return (
      <div>
        {user && provider && <ProviderNav />}
        {!user && (
          <div className="bg-blue-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-sm">
            <span>{t('publicListings.areYouProvider')} </span>
            <button
              onClick={() => setView('auth')}
              className="underline font-medium hover:text-blue-100"
            >
              {t('publicListings.signInPrompt')}
            </button>
            <LanguageSwitcher className="ml-4 text-xs bg-blue-500 border-blue-400 text-white" />
          </div>
        )}
        <PublicListings listings={publicListings} loading={listingsLoading} onSignIn={() => setView('auth')} />
      </div>
    );
  }

  // Auth view
  if (view === 'auth' || !user) {
    return (
      <div>
        <div className="bg-white border-b py-3 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setView('public')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Home size={16} />
              {t('auth.backToListings')}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
        <ProviderAuth
          onEmailAuth={handleEmailAuth}
          onGoogleAuth={handleGoogleAuth}
        />
      </div>
    );
  }

  // Onboarding view (new provider)
  if (view === 'onboarding' && user && !provider) {
    return (
      <div>
        <div className="bg-white border-b py-3 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('common.loading')}</span>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut size={16} />
                {t('common.signOut')}
              </button>
            </div>
          </div>
        </div>
        <ProviderOnboarding onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // Provider dashboard view
  if (view === 'dashboard' && user && provider) {
    const handleAutoFill = (data: {
      infant_spots: number;
      toddler_spots: number;
      preschool_spots: number;
      school_age_spots: number;
    }) => {
      setVacancyData(prev => ({
        ...prev,
        infant_spots: data.infant_spots,
        toddler_spots: data.toddler_spots,
        preschool_spots: data.preschool_spots,
        school_age_spots: data.school_age_spots,
        accepting_infants: data.infant_spots > 0,
        accepting_toddlers: data.toddler_spots > 0,
        accepting_preschool: data.preschool_spots > 0,
        accepting_school_age: data.school_age_spots > 0,
        available_date: prev?.available_date || new Date().toISOString().split('T')[0],
        full_time_available: prev?.full_time_available ?? true,
        part_time_available: prev?.part_time_available ?? false,
        waitlist_available: prev?.waitlist_available ?? false,
        notes: prev?.notes || '',
      }));
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <ProviderNav />
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 mobile-bottom-padding">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{provider.business_name}</h1>
            <p className="text-gray-600">
              {provider.program_type === 'small_family' ? 'Small' : 'Large'} Family Child Care
              {provider.is_elfa_network && ' • ELFA Network'}
            </p>
          </div>

          {/* Roster Summary - shows current capacity based on enrolled children */}
          <RosterSummary
            children={children}
            capacityConfig={getCapacityConfig()}
            onAutoFill={handleAutoFill}
          />

          <VacancyForm
            initialData={vacancyData}
            onSubmit={handleVacancySubmit}
            programType={provider.program_type}
            currentEnrollment={{
              total: children.length,
              infants: children.filter(c => {
                const months = (new Date().getFullYear() - new Date(c.dateOfBirth).getFullYear()) * 12 +
                  (new Date().getMonth() - new Date(c.dateOfBirth).getMonth());
                return months < 24;
              }).length,
            }}
          />

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Your listing is live!</h3>
            <p className="text-sm text-blue-700">
              Families searching for childcare in {provider.neighborhood || provider.zip_code} can see your program.
              Remember to update your vacancy info when your availability changes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Roster view
  if (view === 'roster' && user && provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ProviderNav />
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 mobile-bottom-padding">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Import CSV
            </button>
          </div>
          <ChildList
            children={children}
            onEdit={setEditingChild}
            onRemove={removeChild}
            onAdd={() => setShowChildForm(true)}
            onClearAll={clearChildren}
          />
        </div>

        {/* Child Form Modal */}
        {showChildForm && (
          <ChildForm
            onSubmit={addChild}
            onCancel={() => setShowChildForm(false)}
          />
        )}

        {editingChild && (
          <ChildForm
            initialData={editingChild}
            onSubmit={(data) => updateChild(editingChild.id, data)}
            onCancel={() => setEditingChild(null)}
          />
        )}

        {showImport && (
          <CsvImport
            onImport={importChildren}
            onClose={() => setShowImport(false)}
          />
        )}
      </div>
    );
  }

  // Projections view
  if (view === 'projections' && user && provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ProviderNav />
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 mobile-bottom-padding">
          <Dashboard
            children={children}
            capacityConfig={getCapacityConfig()}
          />
        </div>
      </div>
    );
  }

  // Provider settings view
  if (view === 'settings' && user && provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ProviderNav />
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 mobile-bottom-padding">
          <ProviderSettings
            provider={provider}
            userEmail={user.email || ''}
            onSave={handleUpdateProvider}
            onReverifyElfa={handleReverifyElfa}
          />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Something went wrong. Please refresh the page.</p>
    </div>
  );
}
