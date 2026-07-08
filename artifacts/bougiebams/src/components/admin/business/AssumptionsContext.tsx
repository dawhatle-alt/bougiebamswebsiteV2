import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type BusinessAssumptions, defaultAssumptions } from "./types";
import { bizJson } from "./api";

interface AssumptionsContextType {
  assumptions: BusinessAssumptions;
  updateAssumptions: (partial: Partial<BusinessAssumptions>) => void;
  resetAssumptions: () => void;
  isLoading: boolean;
}

const AssumptionsContext = createContext<AssumptionsContextType | undefined>(undefined);

async function fetchAssumptions(): Promise<BusinessAssumptions> {
  return bizJson<BusinessAssumptions>("/assumptions");
}

async function saveAssumptions(data: Partial<BusinessAssumptions>): Promise<BusinessAssumptions> {
  return bizJson<BusinessAssumptions>("/assumptions", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function AssumptionsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [assumptions, setAssumptions] = useState<BusinessAssumptions>(defaultAssumptions);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["biz-assumptions"],
    queryFn: fetchAssumptions,
    retry: 1,
  });

  // Sync server data into local state once on first load
  useEffect(() => {
    if (data && !initializedRef.current) {
      initializedRef.current = true;
      setAssumptions(data);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: saveAssumptions,
    onSuccess: (saved) => {
      qc.setQueryData(["biz-assumptions"], saved);
    },
  });

  const updateAssumptions = (partial: Partial<BusinessAssumptions>) => {
    setAssumptions((prev) => {
      const next = { ...prev, ...partial };
      // Debounce the API save by 600ms
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        mutation.mutate(next);
      }, 600);
      return next;
    });
  };

  const resetAssumptions = () => {
    setAssumptions(defaultAssumptions);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    mutation.mutate(defaultAssumptions);
  };

  return (
    <AssumptionsContext.Provider value={{ assumptions, updateAssumptions, resetAssumptions, isLoading }}>
      {children}
    </AssumptionsContext.Provider>
  );
}

export function useAssumptions() {
  const context = useContext(AssumptionsContext);
  if (context === undefined) {
    throw new Error("useAssumptions must be used within an AssumptionsProvider");
  }
  return context;
}
