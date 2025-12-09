import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Property } from "@shared/schema";

interface ActivePropertyContextType {
  activePropertyId: number | null;
  activeProperty: Property | null;
  properties: Property[];
  isLoading: boolean;
  setActivePropertyId: (id: number | null) => void;
  clearActiveProperty: () => void;
}

const ActivePropertyContext = createContext<ActivePropertyContextType | null>(null);

const STORAGE_KEY = "swiftnest_active_property";

export function ActivePropertyProvider({ children }: { children: ReactNode }) {
  const [activePropertyId, setActivePropertyIdState] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : null;
    }
    return null;
  });

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const activeProperty = properties.find((p) => p.id === activePropertyId) || null;

  useEffect(() => {
    if (activePropertyId !== null) {
      localStorage.setItem(STORAGE_KEY, String(activePropertyId));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activePropertyId]);

  useEffect(() => {
    if (!isLoading && properties.length > 0 && !activePropertyId) {
      setActivePropertyIdState(properties[0].id);
    }
  }, [properties, isLoading, activePropertyId]);

  useEffect(() => {
    if (activePropertyId && properties.length > 0) {
      const exists = properties.some((p) => p.id === activePropertyId);
      if (!exists) {
        setActivePropertyIdState(properties[0]?.id || null);
      }
    }
  }, [properties, activePropertyId]);

  const setActivePropertyId = (id: number | null) => {
    setActivePropertyIdState(id);
  };

  const clearActiveProperty = () => {
    setActivePropertyIdState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ActivePropertyContext.Provider
      value={{
        activePropertyId,
        activeProperty,
        properties,
        isLoading,
        setActivePropertyId,
        clearActiveProperty,
      }}
    >
      {children}
    </ActivePropertyContext.Provider>
  );
}

export function useActiveProperty() {
  const context = useContext(ActivePropertyContext);
  if (!context) {
    throw new Error("useActiveProperty must be used within an ActivePropertyProvider");
  }
  return context;
}
