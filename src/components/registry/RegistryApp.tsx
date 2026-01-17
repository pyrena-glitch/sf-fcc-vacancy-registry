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
import { ChildList } from '../ChildList';
import { ChildForm } from '../ChildForm';
import { Dashboard } from '../Dashboard';
import { CsvImport } from '../CsvImport';
import { RosterSummary } from './RosterSummary';
import { LogOut, User as UserIcon, Home, Edit3, Eye, Settings, Users, BarChart3 } from 'lucide-react';

type View = 'public' | 'auth' | 'onboarding' | 'dashboard' | 'roster' | 'projections' | 'settings';

export function RegistryApp() {
  const [view, setView] = useState<View>('public');
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [vacancyData, setVacancyData] = useState<VacancyFormData | undefined>();
  const [publicListings, setPublicListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadProviderData(session.user.id);
      }
      setLoading(false);
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadProviderData(session.user.id);
      } else {
        setUser(null);
        setProvider(null);
        setVacancyData(undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load public listings
  useEffect(() => {
    loadPublicListings();
  }, []);

  const loadProviderData = async (userId: string) => {
    const providerData = await getProvider(userId);
    if (providerData) {
      setProvider(providerData);
      loadChildren(userId);
      const vacancy = await getVacancy(userId);
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
          notes: vacancy.notes || '',
        });
      }
      setView('dashboard');
    } else {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Navigation header for logged-in providers
  const ProviderNav = () => (
    <div className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('public')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              view === 'public'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Eye size={18} />
            Public View
          </button>
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              view === 'dashboard'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Edit3 size={18} />
            Vacancies
          </button>
          <button
            onClick={() => setView('roster')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              view === 'roster'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users size={18} />
            Roster
          </button>
          <button
            onClick={() => setView('projections')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              view === 'projections'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 size={18} />
            Projections
          </button>
          <button
            onClick={() => setView('settings')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              view === 'settings'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <UserIcon size={16} />
            {provider?.business_name || user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  // Public view with option to sign in
  if (view === 'public') {
    return (
      <div>
        {user && provider && <ProviderNav />}
        {!user && (
          <div className="bg-blue-600 text-white py-2 px-4 text-center text-sm">
            <span>Are you a licensed FCC provider? </span>
            <button
              onClick={() => setView('auth')}
              className="underline font-medium hover:text-blue-100"
            >
              Sign in to report your vacancies
            </button>
          </div>
        )}
        <PublicListings listings={publicListings} loading={listingsLoading} />
      </div>
    );
  }

  // Auth view
  if (view === 'auth' || !user) {
    return (
      <div>
        <div className="bg-white border-b py-3 px-4">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setView('public')}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Home size={16} />
              Back to Public Listings
            </button>
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
            <span className="text-sm text-gray-600">Setting up your account...</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut size={16} />
              Sign Out
            </button>
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
        notes: prev?.notes || '',
      }));
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <ProviderNav />
        <div className="max-w-2xl mx-auto px-4 py-8">
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
        <div className="max-w-4xl mx-auto px-4 py-8">
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
        <div className="max-w-6xl mx-auto px-4 py-8">
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
        <div className="max-w-2xl mx-auto px-4 py-8">
          <ProviderSettings
            provider={provider}
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
