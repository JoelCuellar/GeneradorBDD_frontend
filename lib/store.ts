import { create } from "zustand";
import { nanoid } from "./util";
import type { DomainModel, ClassDef, RelationDef } from "./schema";

type State = {
  model: DomainModel;
  addClass: (name?: string) => ClassDef;
  addRelation: (sourceId: string, targetId: string) => RelationDef;
  reset: () => void;
};

const initial: DomainModel = { classes: [], relations: [] };

export const useModelStore = create<State>((set, get) => ({
  model: initial,
  addClass: (name = "NewClass") => {
    const cls: ClassDef = { id: nanoid(), name, attributes: [] };
    set(s => ({ model: { ...s.model, classes: [...s.model.classes, cls] } }));
    return cls;
  },
  addRelation: (sourceId, targetId) => {
    const rel: RelationDef = { id: nanoid(), sourceId, targetId, multiplicity:{source:"1", target:"*"} };
    set(s => ({ model: { ...s.model, relations: [...s.model.relations, rel] } }));
    return rel;
  },
  reset: () => set({ model: initial }),
}));
