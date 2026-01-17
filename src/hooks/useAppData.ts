import { useLocalStorage } from './useLocalStorage';
import { Child, CapacityConfig } from '../types';

// CA Regulation 102416.5:
// Infant limits are calculated dynamically based on total enrollment
const DEFAULT_CAPACITY: CapacityConfig = {
  programType: 'small_family',
  totalCapacity: 8,
};

export function useAppData() {
  const [children, setChildren] = useLocalStorage<Child[]>('vacancy-tool-children', []);
  const [capacityConfig, setCapacityConfig] = useLocalStorage<CapacityConfig>(
    'vacancy-tool-capacity',
    DEFAULT_CAPACITY
  );

  const addChild = (child: Omit<Child, 'id'>) => {
    const newChild: Child = {
      ...child,
      id: crypto.randomUUID(),
    };
    setChildren(prev => [...prev, newChild]);
    return newChild;
  };

  const updateChild = (id: string, updates: Partial<Child>) => {
    setChildren(prev =>
      prev.map(child => (child.id === id ? { ...child, ...updates } : child))
    );
  };

  const removeChild = (id: string) => {
    setChildren(prev => prev.filter(child => child.id !== id));
  };

  const importChildren = (newChildren: Omit<Child, 'id'>[]) => {
    const childrenWithIds = newChildren.map(child => ({
      ...child,
      id: crypto.randomUUID(),
    }));
    setChildren(prev => [...prev, ...childrenWithIds]);
  };

  const clearChildren = () => {
    setChildren([]);
  };

  const clearAllData = () => {
    setChildren([]);
    setCapacityConfig(DEFAULT_CAPACITY);
  };

  return {
    children,
    capacityConfig,
    setCapacityConfig,
    addChild,
    updateChild,
    removeChild,
    importChildren,
    clearChildren,
    clearAllData,
  };
}
