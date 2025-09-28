"use client";
import type { RelationKind } from "@/lib/api/domain-model";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DOMAIN_ATTRIBUTE_TYPES,
  type DomainAttribute,
  type DomainAttributeType,
  type DomainClass,
  type DomainConstraintConfig,
  type DomainModelSnapshot,
  type DomainMultiplicity,
  type DomainRelation,
  createDomainAttribute,
  createDomainClass,
  createDomainRelation,
  defineDomainIdentity,
  deleteDomainAttribute,
  deleteDomainClass,
  deleteDomainRelation,
  getDomainModel,
  removeDomainIdentity,
  updateDomainAttribute,
  updateDomainClass,
  updateDomainRelation,
} from "@/lib/api/domain-model";
import { ApiError } from "@/lib/api/client";
import DomainModelDiagram from "./DomainModelDiagram";
import UMLNotationLegend, {
  CLASS_ITEM_IDS,
  RELATION_ITEM_IDS,
  type UMLClassItemId,
  type UMLNotationItemId,
  type UMLRelationItemId,
} from "./UMLNotationLegend";
import { renderMultiplicity, summarizeConfig } from "./utils";

interface DomainModelDesignerProps {
  projectId: string;
  actorId: string;
  onRefresh?: () => void;
}

type AttributeMode = "create" | "edit";

type AttributeFormState = {
  name: string;
  type: DomainAttributeType;
  required: boolean;
  lengthMin: string;
  lengthMax: string;
  min: string;
  max: string;
  pattern: string;
  scale: string;
  precision: string;
};
type RelationMode = "create" | "edit";

type RelationFormState = {
  sourceClassId: string;
  targetClassId: string;
  name: string;
  sourceRole: string;
  targetRole: string;
  sourceMultiplicity: DomainMultiplicity;
  targetMultiplicity: DomainMultiplicity;
  relationType: RelationKind;
};

type IdentityFormState = {
  name: string;
  description: string;
  attributeIds: string[];
};
const INITIAL_ATTRIBUTE_FORM: AttributeFormState = {
  name: "",
  type: DOMAIN_ATTRIBUTE_TYPES[0],
  required: true,
  lengthMin: "",
  lengthMax: "",
  min: "",
  max: "",
  pattern: "",
  scale: "",
  precision: "",
};

const INITIAL_RELATION_FORM: RelationFormState = {
  sourceClassId: "",
  targetClassId: "",
  name: "",
  sourceRole: "",
  targetRole: "",
  sourceMultiplicity: "UNO",
  targetMultiplicity: "UNO",
  relationType: "ASSOCIATION",
};

const INITIAL_IDENTITY_FORM: IdentityFormState = {
  name: "",
  description: "",
  attributeIds: [],
};
const MULTIPLICITY_OPTIONS: { value: DomainMultiplicity; label: string }[] = [
  { value: "UNO", label: "1..1" },
  { value: "CERO_O_UNO", label: "0..1" },
  { value: "UNO_O_MAS", label: "1.." },
  { value: "CERO_O_MAS", label: "0.." },
];

const CLASS_LEGEND_TEMPLATES: Record<
  UMLClassItemId,
  { baseName: string; description: string | null; successMessage: string }
> = {
  class: {
    baseName: "Nueva clase",
    description: null,
    successMessage: "Clase creada desde la leyenda.",
  },
  "abstract-class": {
    baseName: "Nueva clase abstracta",
    description: "Marque los metodos abstractos necesarios.",
    successMessage: "Clase abstracta creada desde la leyenda.",
  },
  interface: {
    baseName: "Nueva interfaz",
    description: "Defina las operaciones de la interfaz.",
    successMessage: "Interfaz creada desde la leyenda.",
  },
  enumeration: {
    baseName: "Nueva enumeracion",
    description: "Agregue los valores que correspondan.",
    successMessage: "Enumeracion creada desde la leyenda.",
  },
};

const RELATION_LEGEND_TEMPLATES: Record<
  UMLRelationItemId,
  {
    label: string;
    name: string | null;
    sourceMultiplicity: DomainMultiplicity;
    targetMultiplicity: DomainMultiplicity;
    successMessage: string;
    kind: RelationKind;
  }
> = {
  association: {
    label: "asociacion",
    name: "Asociacion",
    sourceMultiplicity: "UNO",
    targetMultiplicity: "UNO",
    successMessage: "Asociacion creada desde la leyenda",
    kind: "ASSOCIATION",
  },
  aggregation: {
    label: "agregacion",
    name: "Agregacion",
    sourceMultiplicity: "UNO",
    targetMultiplicity: "CERO_O_MAS",
    successMessage: "Agregacion creada desde la leyenda",
    kind: "AGGREGATION",
  },
  composition: {
    label: "composicion",
    name: "Composicion",
    sourceMultiplicity: "UNO",
    targetMultiplicity: "UNO_O_MAS",
    successMessage: "Composicion creada desde la leyenda",
    kind: "COMPOSITION",
  },
  generalization: {
    label: "generalizacion",
    name: "Generalizacion",
    sourceMultiplicity: "UNO",
    targetMultiplicity: "UNO",
    successMessage: "Generalizacion creada desde la leyenda",
    kind: "GENERALIZATION",
  },
  realization: {
    label: "realizacion",
    name: "Realizacion",
    sourceMultiplicity: "UNO",
    targetMultiplicity: "UNO",
    successMessage: "Realizacion creada desde la leyenda",
    kind: "REALIZATION",
  },
  dependency: {
    label: "dependencia",
    name: "Dependencia",
    sourceMultiplicity: "UNO",
    targetMultiplicity: "UNO",
    successMessage: "Dependencia creada desde la leyenda",
    kind: "DEPENDENCY",
  },
  link: {
    label: "vinculo (sin flechas)",
    name: "Vinculo",
    sourceMultiplicity: "UNO",
    targetMultiplicity: "UNO",
    successMessage: "Vinculo creado desde la leyenda",
    kind: "LINK",
  },
};
const RELATION_KIND_BY_ITEM: Record<UMLRelationItemId, RelationKind> = {
  association: "ASSOCIATION",
  aggregation: "AGGREGATION",
  composition: "COMPOSITION",
  generalization: "GENERALIZATION",
  realization: "REALIZATION",
  dependency: "DEPENDENCY",
  link: "LINK",
};

const CLASS_ITEM_ID_SET = new Set<string>(CLASS_ITEM_IDS);
const RELATION_ITEM_ID_SET = new Set<string>(RELATION_ITEM_IDS);

const isClassLegendItem = (itemId: UMLNotationItemId): itemId is UMLClassItemId =>
  CLASS_ITEM_ID_SET.has(itemId);

const isRelationLegendItem = (itemId: UMLNotationItemId): itemId is UMLRelationItemId =>
  RELATION_ITEM_ID_SET.has(itemId);




export default function DomainModelDesigner({ projectId, actorId, onRefresh }: DomainModelDesignerProps) {
  const [model, setModel] = useState<DomainModelSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

const [activeTab, setActiveTab] = useState<'clases' | 'estructura' | 'relaciones'>('clases');

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);

  const [createClassForm, setCreateClassForm] = useState({ name: "", description: "" });
  const [editClassForm, setEditClassForm] = useState({ name: "", description: "" });

  const [attributeMode, setAttributeMode] = useState<AttributeMode>("create");
  const [attributeForm, setAttributeForm] = useState<AttributeFormState>(INITIAL_ATTRIBUTE_FORM);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);

  const [relationMode, setRelationMode] = useState<RelationMode>("create");
  const [relationForm, setRelationForm] = useState<RelationFormState>(INITIAL_RELATION_FORM);
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);

  const [identityForm, setIdentityForm] = useState<IdentityFormState>(INITIAL_IDENTITY_FORM);
  const [editingIdentityId, setEditingIdentityId] = useState<string | null>(null);
  const [pendingLegendRelation, setPendingLegendRelation] = useState<
    { itemId: UMLRelationItemId; sourceClassId?: string } | null
  >(null);

  const reloadModel = useCallback(() => {
    setLoading(true);
    setError(null);
    getDomainModel(projectId, actorId)
      .then((snapshot) => {
        setModel(snapshot);
        if (!selectedClassId && snapshot.classes.length > 0) {
          setSelectedClassId(snapshot.classes[0].id);
        }
        if (
          selectedClassId &&
          !snapshot.classes.some((domainClass) => domainClass.id === selectedClassId)
        ) {
          setSelectedClassId(snapshot.classes.length > 0 ? snapshot.classes[0].id : null);
        }
      })
      .catch((err) => setError(resolveError(err)))
      .finally(() => setLoading(false));
  }, [projectId, actorId, selectedClassId]);

  useEffect(() => {
    reloadModel();
  }, [reloadModel]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const classes = useMemo(() => model?.classes ?? [], [model?.classes]);
  const relations = useMemo(() => model?.relations ?? [], [model?.relations]);

  const generateUniqueName = useCallback(
    (baseName: string) => {
      const normalized = baseName.trim();
      if (!normalized) {
        return baseName.trim();
      }
      const existing = new Set(classes.map((domainClass) => domainClass.name.toLowerCase()));
      if (!existing.has(normalized.toLowerCase())) {
        return normalized;
      }
      let suffix = 2;
      while (existing.has(`${normalized} ${suffix}`.toLowerCase())) {
        suffix += 1;
      }
      return `${normalized} ${suffix}`;
    },
    [classes],
  );

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleSelectRelation = useCallback(
    (relationId: string | null) => {
      setSelectedRelationId(relationId);
      if (relationId) {
        setActiveTab('relaciones');
        scrollToSection("selection-panel");
      }
    },
    [scrollToSection],
  );

  const handleQuickCreateRelation = useCallback(
    async (sourceClassId: string, targetClassId: string) => {
      if (
        relations.some(
          (relation) =>
            relation.sourceClassId === sourceClassId && relation.targetClassId === targetClassId,
        )
      ) {
        setFeedback("La relacion ya existe entre estas clases");
        setPendingLegendRelation(null);
        return;
      }
      setError(null);
      try {
        await createDomainRelation({
          projectId,
          actorId,
          sourceClassId,
          targetClassId,
          sourceMultiplicity: "UNO",
          targetMultiplicity: "UNO",
        });
        setFeedback("Relacion creada desde el diagrama");
        setPendingLegendRelation(null);
        reloadModel();
        onRefresh?.();
      } catch (err) {
        setError(resolveError(err));
      }
    },
    [relations, projectId, actorId, reloadModel, onRefresh, setError, setFeedback],
  );

  const handleLegendItemActivate = useCallback(
    async (itemId: UMLNotationItemId) => {
      if (isClassLegendItem(itemId)) {
        setPendingLegendRelation(null);
        const template = CLASS_LEGEND_TEMPLATES[itemId];
        const name = generateUniqueName(template.baseName);
        if (!name) {
          return;
        }
        setError(null);
        try {
          const createdClass = await createDomainClass({
            projectId,
            actorId,
            name,
            description: template.description,
          });
          setModel((prev) => {
            if (!prev) {
              return { classes: [createdClass], relations: [] };
            }
            if (prev.classes.some((domainClass) => domainClass.id === createdClass.id)) {
              return prev;
            }
            return { ...prev, classes: [...prev.classes, createdClass] };
          });
          setSelectedClassId(createdClass.id);
          setFeedback(template.successMessage);
          reloadModel();
          onRefresh?.();
        } catch (err) {
          setError(resolveError(err));
        }
        return;
      }

      if (isRelationLegendItem(itemId)) {
        if (classes.length < 2) {
          setFeedback("Necesitas al menos dos clases para crear una relacion.");
          return;
        }
        const template = RELATION_LEGEND_TEMPLATES[itemId];
        setPendingLegendRelation({ itemId });
        setFeedback(`Selecciona la clase origen en el diagrama para crear la ${template.label}.`);
      }
    },
    [actorId, classes, generateUniqueName, onRefresh, projectId, reloadModel],
  );

  const getClassName = useCallback(
    (classId: string) =>
      classes.find((domainClass) => domainClass.id === classId)?.name ?? "(sin nombre)",
    [classes],
  );

  const createRelationFromLegend = useCallback(
    async (sourceClassId: string, targetClassId: string, itemId: UMLRelationItemId) => {
      const alreadyExists = relations.some(
        (relation) =>
          relation.sourceClassId === sourceClassId && relation.targetClassId === targetClassId,
      );
      if (alreadyExists) {
        setFeedback("Ya existe una relacion entre las clases seleccionadas.");
        setPendingLegendRelation(null);
        return;
      }
      const template = RELATION_LEGEND_TEMPLATES[itemId];
      setError(null);
      try {
        const createdRelation = await createDomainRelation({
          projectId,
          actorId,
          sourceClassId,
          targetClassId,
          sourceMultiplicity: template.sourceMultiplicity,
          targetMultiplicity: template.targetMultiplicity,
          name: template.name,
          type: template.kind,
        });
        setModel((prev) => {
          if (!prev) {
            return prev;
          }
          if (prev.relations.some((relation) => relation.id === createdRelation.id)) {
            return prev;
          }
          return { ...prev, relations: [...prev.relations, createdRelation] };
        });
        setSelectedRelationId(createdRelation.id);
        const sourceName = getClassName(sourceClassId);
        const targetName = getClassName(targetClassId);
        setFeedback(`${template.successMessage} entre ${sourceName} y ${targetName}.`);
        reloadModel();
        onRefresh?.();
      } catch (err) {
        setError(resolveError(err));
      } finally {
        setPendingLegendRelation(null);
      }
    },
    [actorId, getClassName, onRefresh, projectId, reloadModel, relations],
  );

  const handleSelectClassFromDiagram = useCallback(
    (classId: string) => {
      setSelectedClassId(classId);
      setSelectedRelationId(null);

      if (pendingLegendRelation) {
        const template = RELATION_LEGEND_TEMPLATES[pendingLegendRelation.itemId];
        if (!pendingLegendRelation.sourceClassId) {
          setPendingLegendRelation({ itemId: pendingLegendRelation.itemId, sourceClassId: classId });
          setFeedback(`Selecciona la clase destino para completar la ${template.label}.`);
        } else if (pendingLegendRelation.sourceClassId === classId) {
          setFeedback("Selecciona una clase distinta como destino.");
        } else {
          void createRelationFromLegend(
            pendingLegendRelation.sourceClassId,
            classId,
            pendingLegendRelation.itemId,
          );
        }
      }
      setActiveTab('estructura');
      scrollToSection("selection-panel");
    },
    [createRelationFromLegend, pendingLegendRelation, scrollToSection],
  );

  const selectedClass = useMemo(
    () => classes.find((domainClass) => domainClass.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const selectedRelation = useMemo(
    () => relations.find((relation) => relation.id === selectedRelationId) ?? null,
    [relations, selectedRelationId],
  );
  useEffect(() => {
    if (!selectedClass) {
      setEditClassForm({ name: "", description: "" });
      resetAttributeForm();
      resetRelationForm();
      resetIdentityForm();
      return;
    }

    setEditClassForm({
      name: selectedClass.name,
      description: selectedClass.description ?? "",
    });

    resetAttributeForm();
    resetRelationForm(selectedClass.id);
    resetIdentityForm();
  }, [selectedClass]);
  useEffect(() => {
    if (!selectedClass) return;
    setIdentityForm((prev) => ({
      ...prev,
      attributeIds: prev.attributeIds.filter((id) =>
        selectedClass.attributes.some((attribute) => attribute.id === id),
      ),
    }));
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedRelationId) return;
    if (!relations.some((relation) => relation.id === selectedRelationId)) {
      setSelectedRelationId(null);
    }
  }, [relations, selectedRelationId]);

  const relationsToShow = useMemo(() => {
    if (!selectedClassId) return relations;
    return relations.filter(
      (relation) =>
        relation.sourceClassId === selectedClassId || relation.targetClassId === selectedClassId,
    );
  }, [relations, selectedClassId]);

  const relatedRelationsCount = useMemo(() => {
    if (!selectedClassId) return 0;
    return relations.filter(
      (relation) =>
        relation.sourceClassId === selectedClassId || relation.targetClassId === selectedClassId,
    ).length;
  }, [relations, selectedClassId]);
  const handleCreateClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = createClassForm.name.trim();
    if (!name) {
      setError("El nombre de la clase es obligatorio");
      return;
    }
    setError(null);
    try {
      await createDomainClass({
        projectId,
        actorId,
        name,
        description: createClassForm.description.trim() || null,
      });
      setCreateClassForm({ name: "", description: "" });
      setFeedback("Clase creada");
      reloadModel();
      onRefresh?.();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleUpdateClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClass) return;
    const name = editClassForm.name.trim();
    if (!name) {
      setError("El nombre de la clase es obligatorio");
      return;
    }
    setError(null);
    try {
      await updateDomainClass({
        projectId,
        actorId,
        classId: selectedClass.id,
        name,
        description: editClassForm.description.trim() || null,
      });
      setFeedback("Clase actualizada");
      reloadModel();
      onRefresh?.();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleDeleteClass = async (domainClass: DomainClass) => {
    if (!window.confirm(`Se eliminara la clase "${domainClass.name}". Desea continuar?`)) {
      return;
    }
    setError(null);
    try {
      await deleteDomainClass({ projectId, actorId, classId: domainClass.id });
      setFeedback("Clase eliminada");
      reloadModel();
      onRefresh?.();
    } catch (err) {
      setError(resolveError(err));
    }
  };
  const handleAttributeFormChange = (
    field: keyof AttributeFormState,
    value: string | boolean,
  ) => {
    setAttributeForm((prev) => ({ ...prev, [field]: value } as AttributeFormState));
  };

  const resetAttributeForm = () => {
    setAttributeMode("create");
    setEditingAttributeId(null);
    setAttributeForm(INITIAL_ATTRIBUTE_FORM);
  };

  const resetRelationForm = (sourceId?: string) => {
    setRelationMode("create");
    setEditingRelationId(null);
    setRelationForm({
      ...INITIAL_RELATION_FORM,
      sourceClassId: sourceId ?? "",
    });
  };

  const resetIdentityForm = () => {
    setIdentityForm(INITIAL_IDENTITY_FORM);
    setEditingIdentityId(null);
  };

  const populateAttributeForm = (attribute: DomainAttribute) => {
    setAttributeForm({
      name: attribute.name,
      type: attribute.type,
      required: attribute.required,
      lengthMin: attribute.config?.lengthMin?.toString() ?? "",
      lengthMax: attribute.config?.lengthMax?.toString() ?? "",
      min: attribute.config?.min?.toString() ?? "",
      max: attribute.config?.max?.toString() ?? "",
      pattern: attribute.config?.pattern ?? "",
      scale: attribute.config?.scale?.toString() ?? "",
      precision: attribute.config?.precision?.toString() ?? "",
    });
  };
  const buildAttributeConfig = (): { config: DomainConstraintConfig | null; error?: string } => {
    const config: DomainConstraintConfig = {};

    const parseNumber = (label: string, value: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        return { error: `El campo ${label} debe ser numerico` };
      }
      return parsed;
    };

    const lengthMin = parseNumber("longitud minima", attributeForm.lengthMin);
    if (typeof lengthMin === "object") return { config: null, error: lengthMin.error };
    if (lengthMin !== undefined) config.lengthMin = lengthMin;

    const lengthMax = parseNumber("longitud maxima", attributeForm.lengthMax);
    if (typeof lengthMax === "object") return { config: null, error: lengthMax.error };
    if (lengthMax !== undefined) config.lengthMax = lengthMax;

    const min = parseNumber("valor minimo", attributeForm.min);
    if (typeof min === "object") return { config: null, error: min.error };
    if (min !== undefined) config.min = min;

    const max = parseNumber("valor maximo", attributeForm.max);
    if (typeof max === "object") return { config: null, error: max.error };
    if (max !== undefined) config.max = max;
    const scale = parseNumber("escala", attributeForm.scale);
    if (typeof scale === "object") return { config: null, error: scale.error };
    if (scale !== undefined) config.scale = scale;

    const precision = parseNumber("precision", attributeForm.precision);
    if (typeof precision === "object") return { config: null, error: precision.error };
    if (precision !== undefined) config.precision = precision;

    if (attributeForm.pattern.trim()) {
      config.pattern = attributeForm.pattern.trim();
    }

    return { config: Object.keys(config).length > 0 ? config : null };
  };
  const handleSubmitAttribute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClass) return;
    const name = attributeForm.name.trim();
    if (!name) {
      setError("El nombre del atributo es obligatorio");
      return;
    }
    const { config, error: configError } = buildAttributeConfig();
    if (configError) {
      setError(configError);
      return;
    }
    setError(null);
    try {
      if (attributeMode === "create") {
        await createDomainAttribute({
          projectId,
          actorId,
          classId: selectedClass.id,
          name,
          type: attributeForm.type,
          required: attributeForm.required,
          config: config ?? undefined,
        });
        setFeedback("Atributo creado");
      } else if (editingAttributeId) {
        await updateDomainAttribute({
          projectId,
          actorId,
          attributeId: editingAttributeId,
          name,
          type: attributeForm.type,
          required: attributeForm.required,
          config: config ?? null,
        });
        setFeedback("Atributo actualizado");
      }
      reloadModel();
      onRefresh?.();
      resetAttributeForm();
    } catch (err) {
      setError(resolveError(err));
    }
  };
  const handleEditAttribute = (attribute: DomainAttribute) => {
    setAttributeMode("edit");
    setEditingAttributeId(attribute.id);
    populateAttributeForm(attribute);
  };

  const handleDeleteAttribute = async (attribute: DomainAttribute) => {
    if (!window.confirm(`Se eliminara el atributo "${attribute.name}". Continuar?`)) return;
    setError(null);
    try {
      await deleteDomainAttribute({ projectId, actorId, attributeId: attribute.id });
      setFeedback("Atributo eliminado");
      reloadModel();
      onRefresh?.();
    } catch (err) {
      setError(resolveError(err));
    }
  };
  const handleRelationFormChange = (
    field: keyof RelationFormState,
    value: string,
  ) => {
    setRelationForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitRelation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!relationForm.sourceClassId || !relationForm.targetClassId) {
      setError("Debe seleccionar clase origen y destino");
      return;
    }
    setError(null);
    try {
      const name = relationForm.name.trim();
      const sourceRole = relationForm.sourceRole.trim();
      const targetRole = relationForm.targetRole.trim();

      if (relationMode === "create") {
        await createDomainRelation({
          projectId,
          actorId,
          sourceClassId: relationForm.sourceClassId,
          targetClassId: relationForm.targetClassId,
          name: name || null,
          sourceRole: sourceRole || null,
          targetRole: targetRole || null,
          sourceMultiplicity: relationForm.sourceMultiplicity,
          targetMultiplicity: relationForm.targetMultiplicity,
          type: relationForm.relationType, 
        });
        setFeedback("Relacion creada");
      } else if (editingRelationId) {
        await updateDomainRelation({
          projectId,
          actorId,
          relationId: editingRelationId,
          name: name || null,
          sourceRole: sourceRole || null,
          targetRole: targetRole || null,
          sourceMultiplicity: relationForm.sourceMultiplicity,
          targetMultiplicity: relationForm.targetMultiplicity,
          type: relationForm.relationType,
        });
        setFeedback("Relacion actualizada");
      }
      reloadModel();
      onRefresh?.();
      resetRelationForm(selectedClassId ?? undefined);
    } catch (err) {
      setError(resolveError(err));
    }
  };
  const handleEditRelation = (relation: DomainRelation) => {
    handleSelectRelation(relation.id);
    setRelationMode("edit");
    setEditingRelationId(relation.id);
    setRelationForm({
      sourceClassId: relation.sourceClassId,
      targetClassId: relation.targetClassId,
      name: relation.name ?? "",
      sourceRole: relation.sourceRole ?? "",
      targetRole: relation.targetRole ?? "",
      sourceMultiplicity: relation.sourceMultiplicity,
      targetMultiplicity: relation.targetMultiplicity,
      relationType: relation.type,
    });
    scrollToSection("relations-panel");
  };

  const handleDeleteRelation = async (relation: DomainRelation) => {
    if (!window.confirm("La relacion se eliminara. Desea continuar?")) return;
    setError(null);
    try {
      await deleteDomainRelation({ projectId, actorId, relationId: relation.id });
      if (selectedRelationId === relation.id) {
        setSelectedRelationId(null);
      }
      setFeedback("Relacion eliminada");
      reloadModel();
      onRefresh?.();
    } catch (err) {
      setError(resolveError(err));
    }
  };
  const toggleIdentityAttribute = (attributeId: string) => {
    setIdentityForm((prev) => {
      const includes = prev.attributeIds.includes(attributeId);
      return {
        ...prev,
        attributeIds: includes
          ? prev.attributeIds.filter((id) => id !== attributeId)
          : [...prev.attributeIds, attributeId],
      };
    });
  };

  const handleSubmitIdentity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClass) return;
    const name = identityForm.name.trim();
    if (!name) {
      setError("El nombre de la identidad es obligatorio");
      return;
    }
    if (identityForm.attributeIds.length === 0) {
      setError("Seleccione al menos un atributo");
      return;
    }
    setError(null);
    try {
      await defineDomainIdentity({
        projectId,
        actorId,
        classId: selectedClass.id,
        identityId: editingIdentityId ?? undefined,
        name,
        description: identityForm.description.trim() || null,
        attributeIds: identityForm.attributeIds,
      });
      setFeedback(editingIdentityId ? "Identidad actualizada" : "Identidad creada");
      reloadModel();
      onRefresh?.();
      resetIdentityForm();
    } catch (err) {
      setError(resolveError(err));
    }
  };
  const handleEditIdentity = (identity: DomainClass["identities"][number]) => {
    setEditingIdentityId(identity.id);
    setIdentityForm({
      name: identity.name,
      description: identity.description ?? "",
      attributeIds: identity.attributeIds,
    });
  };

  const handleDeleteIdentity = async (identityId: string) => {
    if (!window.confirm("La identidad seleccionada se eliminara. Continuar?")) return;
    setError(null);
    try {
      await removeDomainIdentity({ projectId, actorId, identityId });
      setFeedback("Identidad eliminada");
      reloadModel();
      onRefresh?.();
      if (editingIdentityId === identityId) {
        resetIdentityForm();
      }
    } catch (err) {
      setError(resolveError(err));
    }
  };
  if (!model && loading) {
    return <div className="rounded border border-gray-200 bg-white p-6">Cargando modelo...</div>;
  }

  return (
    <main className=" w-[99dvw] mx-[calc(50%-50dvw)] min-h-screen bg-white overflow-x-clip">
      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {feedback ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      <div className="grid
  grid-cols-[minmax(240px,280px)_1fr_minmax(320px,380px)]
  gap-3 sm:gap-4
  pl-2 sm:pl-3 lg:pl-4 pr-0
  max-w-[100dvw] overflow-x-hidden">
        <aside className="sticky top-2 self-start h-[82vh] xl:h-[84vh]">
          <UMLNotationLegend
            onItemActivate={handleLegendItemActivate}
            activeItemId={pendingLegendRelation?.itemId ?? null}
          />
        </aside>
        <div className="h-[78vh] sm:h-[80vh] lg:h-[82vh] xl:h-[84vh] rounded-lg border border-gray-200 bg-gray-50">
          <DomainModelDiagram
            classes={classes}
            relations={relations}
            selectedClassId={selectedClassId}
            selectedRelationId={selectedRelationId}
            onSelectClass={handleSelectClassFromDiagram}
            onSelectRelation={handleSelectRelation}
            onCreateRelation={handleQuickCreateRelation}
          />

          {selectedClass ? (
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selectedClass.name}</h2>
                  <p className="text-sm text-gray-600">{selectedClass.description ? selectedClass.description : "Sin descripcion registrada."}</p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection("structure-panel")}
                  className="rounded border border-blue-600 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Abrir estructura
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <dt className="text-xs uppercase text-gray-500">Atributos</dt>
                  <dd className="text-lg font-semibold text-gray-900">{selectedClass.attributes.length}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-gray-500">Identidades</dt>
                  <dd className="text-lg font-semibold text-gray-900">{selectedClass.identities.length}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-gray-500">Relaciones</dt>
                  <dd className="text-lg font-semibold text-gray-900">{relatedRelationsCount}</dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600 shadow-sm">
              <p className="font-medium text-gray-800">Sin clase seleccionada</p>
              <p className="mt-1">Selecciona una clase en la barra lateral o crea una nueva para comenzar a modelar.</p>
              <button
                type="button"
                onClick={() => scrollToSection("classes-panel")}
                className="mt-4 rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Ir a clases
              </button>
            </section>
          )}
        </div>
       <aside className="space-y-4 lg:sticky lg:top-2 justify-self-end w-full -mr-3 sm:-mr-4 lg:-mr-6">
  {/* Encabezado + pestañas */}
  <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="border-b border-gray-200 px-4 py-3">
      <h2 className="text-sm font-semibold text-gray-900">Barra lateral</h2>
      <p className="text-xs text-gray-500">Accede a clases, estructura y relaciones del modelo.</p>
    </div>
    <div className="flex flex-wrap gap-2 px-4 py-3">
      <button
        type="button"
        onClick={() => setActiveTab('clases')}
        className={`rounded px-3 py-1 text-xs font-semibold ${
          activeTab === 'clases' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        Clases
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('estructura')}
        className={`rounded px-3 py-1 text-xs font-semibold ${
          activeTab === 'estructura' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        Estructura
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('relaciones')}
        className={`rounded px-3 py-1 text-xs font-semibold ${
          activeTab === 'relaciones' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        Relaciones
      </button>
    </div>
  </div>

  {/* Contenedor de contenido por pestaña */}
  <div className="rounded-lg border border-gray-200 bg-white shadow-sm h-[82vh] overflow-y-auto p-4">
    {/* ======== CLASES (solo la seleccionada) ======== */}
    {activeTab === 'clases' && (
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Clase seleccionada</label>
          <select
            value={selectedClassId ?? ''}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">(ninguna)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClass ? (
          <form className="space-y-3" onSubmit={handleUpdateClass}>
            <h3 className="text-sm font-semibold text-gray-800">Editar clase</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Nombre</label>
              <input
                value={editClassForm.name}
                onChange={(e) => setEditClassForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Descripción (opcional)</label>
              <textarea
                value={editClassForm.description}
                onChange={(e) => setEditClassForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Guardar cambios
              </button>
              <button
                type="button"
                onClick={() => selectedClass && handleDeleteClass(selectedClass)}
                className="rounded border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                Eliminar
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500">Selecciona una clase para editarla.</p>
        )}
      </div>
    )}

    {/* ======== ESTRUCTURA (solo de la clase seleccionada) ======== */}
    {activeTab === 'estructura' && (
      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Clase seleccionada</label>
          <select
            value={selectedClassId ?? ''}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">(ninguna)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClass ? (
          <>
            {/* --- ATRIBUTOS --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Atributos</h3>
              {selectedClass.attributes.length === 0 ? (
                <p className="text-sm text-gray-500">Esta clase aun no tiene atributos.</p>
              ) : (
                <ul className="space-y-3">
                  {selectedClass.attributes.map((attribute) => (
                    <li
                      key={attribute.id}
                      className="rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{attribute.name}</p>
                          <p className="text-xs text-gray-500">{attribute.type}</p>
                          <p className="text-xs text-gray-500">
                            {attribute.required ? 'Obligatorio' : 'Opcional'}
                          </p>
                          {attribute.config ? (
                            <p className="text-xs text-gray-500">{summarizeConfig(attribute.config)}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditAttribute(attribute)}
                            className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttribute(attribute)}
                            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Form atributo (tu mismo handler) */}
              <form className="space-y-3 border-t border-gray-200 pt-4" onSubmit={handleSubmitAttribute}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {attributeMode === 'create' ? 'Agregar atributo' : 'Editar atributo'}
                  </h3>
                  {attributeMode === 'edit' ? (
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={resetAttributeForm}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-gray-600">Nombre</label>
                    <input
                      value={attributeForm.name}
                      onChange={(e) => handleAttributeFormChange('name', e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Tipo</label>
                    <select
                      value={attributeForm.type}
                      onChange={(e) => handleAttributeFormChange('type', e.target.value as any)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      {DOMAIN_ATTRIBUTE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-5 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={attributeForm.required}
                      onChange={(e) => handleAttributeFormChange('required', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Obligatorio
                  </label>
                </div>

                {/* Puedes dejar tus NumberField / pattern aquí si quieres */}
                <button className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  {attributeMode === 'create' ? 'Crear atributo' : 'Actualizar atributo'}
                </button>
              </form>
            </div>

            {/* --- IDENTIDADES --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Identidades</h3>
              {selectedClass.identities.length === 0 ? (
                <p className="text-sm text-gray-500">No hay identidades definidas para esta clase.</p>
              ) : (
                <ul className="space-y-3">
                  {selectedClass.identities.map((identity) => (
                    <li
                      key={identity.id}
                      className="rounded border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{identity.name}</p>
                          {identity.description ? (
                            <p className="text-xs text-gray-500">{identity.description}</p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            {identity.attributeIds
                              .map(
                                (attributeId) =>
                                  selectedClass.attributes.find((a) => a.id === attributeId)?.name ?? attributeId,
                              )
                              .join(', ')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditIdentity(identity)}
                            className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIdentity(identity.id)}
                            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Form identidad */}
              <form className="space-y-3 border-t border-gray-200 pt-4" onSubmit={handleSubmitIdentity}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {editingIdentityId ? 'Editar identidad' : 'Nueva identidad'}
                  </h3>
                  {editingIdentityId ? (
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={resetIdentityForm}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>

                {/* (mantén tus campos actuales de identidad) */}

                <button className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  {editingIdentityId ? 'Actualizar identidad' : 'Crear identidad'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Selecciona una clase para gestionar su estructura.</p>
        )}
      </div>
    )}

    {/* ======== RELACIONES (solo form de la seleccionada) ======== */}
    {/* ======== RELACIONES (solo form de la seleccionada) ======== */}
{activeTab === 'relaciones' && (
  <div className="space-y-4">
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">Relación seleccionada</label>
      <select
        value={selectedRelationId ?? ''}
        onChange={(e) => {
          const id = e.target.value || null;
          setSelectedRelationId(id);
          const rel = relations.find((r) => r.id === id);
          if (rel) {
            handleEditRelation(rel);
          } else {
            setRelationMode('create');
            setEditingRelationId(null);
            resetRelationForm(selectedClassId ?? undefined);
          }
        }}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">(ninguna)</option>
        {(selectedClassId ? relations.filter(r => r.sourceClassId === selectedClassId || r.targetClassId === selectedClassId) : relations)
          .map((r) => (
            <option key={r.id} value={r.id}>
              {`${getClassName(r.sourceClassId)} -> ${getClassName(r.targetClassId)}${r.name ? ` · ${r.name}` : ''}`}
            </option>
          ))}
      </select>
    </div>

    {/* 🔧 Un solo form aquí */}
    <form className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4" onSubmit={handleSubmitRelation}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          {relationMode === 'create' ? 'Nueva relación' : 'Editar relación'}
        </h3>
        {relationMode === 'edit' ? (
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={() => resetRelationForm(selectedClassId ?? undefined)}
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <section id="relations-panel" className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <header className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Relaciones</h2>
          <p className="text-sm text-gray-600">
            Crea, edita o elimina relaciones. Se priorizan las asociadas a la clase seleccionada.
          </p>
        </header>

        <div className="space-y-6 p-6">
          {/* LISTA / SELECCIÓN */}
          <div className="space-y-3">
            {relationsToShow.length === 0 ? (
              <p className="text-sm text-gray-500">No hay relaciones para mostrar.</p>
            ) : (
              <ul className="space-y-3">
                {relationsToShow.map((relation) => {
                  const isSelected = relation.id === selectedRelationId;
                  return (
                    <li
                      key={relation.id}
                      onClick={() => handleSelectRelation(relation.id)}
                      className={`cursor-pointer rounded border px-4 py-3 text-sm transition ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {getClassName(relation.sourceClassId)} → {getClassName(relation.targetClassId)}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                            Origen: {renderMultiplicity(relation.sourceMultiplicity)} ·
                            {' '}Destino: {renderMultiplicity(relation.targetMultiplicity)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRelation(relation);
                            }}
                            className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRelation(relation);
                            }}
                            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* CAMPOS DEL FORM (sin otro <form>) */}
         <div className="space-y-3">
  {/* Clase origen */}
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-600">Clase origen</label>
    <select
      value={relationForm.sourceClassId}
      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
        handleRelationFormChange('sourceClassId', e.target.value)
      }
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
    >
      <option value="">Seleccionar</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  </div>

  {/* Clase destino */}
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-600">Clase destino</label>
    <select
      value={relationForm.targetClassId}
      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
        handleRelationFormChange('targetClassId', e.target.value)
      }
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
    >
      <option value="">Seleccionar</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  </div>

  {/* Nombre (opcional) */}
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-600">Nombre (opcional)</label>
    <input
      value={relationForm.name}
      onChange={(e) => handleRelationFormChange('name', e.target.value)}
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
    />
  </div>

  {/* Tipo */}
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-600">Tipo</label>
    <select
      value={relationForm.relationType}
      onChange={(e) =>
        handleRelationFormChange('relationType', e.target.value as RelationKind)
      }
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
    >
      <option value="ASSOCIATION">Asociación</option>
      <option value="AGGREGATION">Agregación (◇)</option>
      <option value="COMPOSITION">Composición (◆)</option>
      <option value="GENERALIZATION">Generalización</option>
      <option value="REALIZATION">Realización (discontinua)</option>
      <option value="DEPENDENCY">Dependencia (discontinua)</option>
      <option value="LINK">Sin flechas</option>
    </select>
  </div>

  {/* Roles */}
  <div className="grid gap-3 md:grid-cols-2">
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">Rol origen (opcional)</label>
      <input
        value={relationForm.sourceRole}
        onChange={(e) => handleRelationFormChange('sourceRole', e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">Rol destino (opcional)</label>
      <input
        value={relationForm.targetRole}
        onChange={(e) => handleRelationFormChange('targetRole', e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  </div>

  {/* Multiplicidades */}
  <div className="grid gap-3 md:grid-cols-2">
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">Multiplicidad origen</label>
      <select
        value={relationForm.sourceMultiplicity}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          handleRelationFormChange('sourceMultiplicity', e.target.value as DomainMultiplicity)
        }
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        {MULTIPLICITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>

    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">Multiplicidad destino</label>
      <select
        value={relationForm.targetMultiplicity}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          handleRelationFormChange('targetMultiplicity', e.target.value as DomainMultiplicity)
        }
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        {MULTIPLICITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* Botones extra (opcional) */}
  {relationMode === 'edit' && editingRelationId ? (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => {
          const rel = relations.find(r => r.id === editingRelationId);
          if (rel) { void handleDeleteRelation(rel); }
        }}
        className="rounded border border-rose-200 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
      >
        Eliminar relación
      </button>
    </div>
  ) : null}
</div>

        </div>
      </section>

      {/* ✅ ÚNICO botón submit del form */}
      <button
        type="submit"
        className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {relationMode === 'create' ? 'Crear relación' : 'Actualizar relación'}
      </button>
    </form>
  </div>
)}

  </div>
</aside>

      </div>
    </main>
  );
}
interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        inputMode="decimal"
      />
    </div>
  );
}
const resolveError = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrio un error inesperado";
};

























