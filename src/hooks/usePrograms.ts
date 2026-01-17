import { useLocalStorage } from './useLocalStorage';
import { Program, Child } from '../types';

const DEFAULT_PROGRAM: Omit<Program, 'id' | 'createdAt'> = {
  name: 'My Program',
  programType: 'small_family',
  totalCapacity: 8,
  children: [],
};

export function usePrograms() {
  const [programs, setPrograms] = useLocalStorage<Program[]>('vacancy-tool-programs', []);
  const [activeProgramId, setActiveProgramId] = useLocalStorage<string | null>(
    'vacancy-tool-active-program',
    null
  );

  // Get active program
  const activeProgram = programs.find(p => p.id === activeProgramId) || programs[0] || null;

  // Create a new program
  const createProgram = (data: Partial<Omit<Program, 'id' | 'createdAt' | 'children'>>) => {
    const newProgram: Program = {
      ...DEFAULT_PROGRAM,
      ...data,
      id: crypto.randomUUID(),
      children: [],
      createdAt: new Date().toISOString(),
    };
    setPrograms(prev => [...prev, newProgram]);
    setActiveProgramId(newProgram.id);
    return newProgram;
  };

  // Update program settings
  const updateProgram = (programId: string, updates: Partial<Omit<Program, 'id' | 'createdAt' | 'children'>>) => {
    setPrograms(prev =>
      prev.map(p => (p.id === programId ? { ...p, ...updates } : p))
    );
  };

  // Delete a program
  const deleteProgram = (programId: string) => {
    setPrograms(prev => prev.filter(p => p.id !== programId));
    if (activeProgramId === programId) {
      const remaining = programs.filter(p => p.id !== programId);
      setActiveProgramId(remaining[0]?.id || null);
    }
  };

  // Add child to active program
  const addChild = (child: Omit<Child, 'id'>) => {
    if (!activeProgram) return null;

    const newChild: Child = {
      ...child,
      id: crypto.randomUUID(),
    };

    setPrograms(prev =>
      prev.map(p =>
        p.id === activeProgram.id
          ? { ...p, children: [...p.children, newChild] }
          : p
      )
    );

    return newChild;
  };

  // Update child in active program
  const updateChild = (childId: string, updates: Partial<Child>) => {
    if (!activeProgram) return;

    setPrograms(prev =>
      prev.map(p =>
        p.id === activeProgram.id
          ? {
              ...p,
              children: p.children.map(c =>
                c.id === childId ? { ...c, ...updates } : c
              ),
            }
          : p
      )
    );
  };

  // Remove child from active program
  const removeChild = (childId: string) => {
    if (!activeProgram) return;

    setPrograms(prev =>
      prev.map(p =>
        p.id === activeProgram.id
          ? { ...p, children: p.children.filter(c => c.id !== childId) }
          : p
      )
    );
  };

  // Import children to active program
  const importChildren = (newChildren: Omit<Child, 'id'>[]) => {
    if (!activeProgram) return;

    const childrenWithIds = newChildren.map(child => ({
      ...child,
      id: crypto.randomUUID(),
    }));

    setPrograms(prev =>
      prev.map(p =>
        p.id === activeProgram.id
          ? { ...p, children: [...p.children, ...childrenWithIds] }
          : p
      )
    );
  };

  // Switch active program
  const switchProgram = (programId: string) => {
    setActiveProgramId(programId);
  };

  // Get capacity config for current program (for compatibility)
  const capacityConfig = activeProgram
    ? {
        programType: activeProgram.programType,
        totalCapacity: activeProgram.totalCapacity,
      }
    : { programType: 'small_family' as const, totalCapacity: 8 };

  // Update capacity config for active program
  const setCapacityConfig = (config: { programType: 'small_family' | 'large_family'; totalCapacity: number }) => {
    if (!activeProgram) return;
    updateProgram(activeProgram.id, config);
  };

  return {
    // Programs
    programs,
    activeProgram,
    activeProgramId,
    createProgram,
    updateProgram,
    deleteProgram,
    switchProgram,

    // Children (for active program)
    children: activeProgram?.children || [],
    addChild,
    updateChild,
    removeChild,
    importChildren,

    // Capacity (for compatibility)
    capacityConfig,
    setCapacityConfig,
  };
}
