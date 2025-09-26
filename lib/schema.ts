import { z } from "zod";

export const AttributeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["string","number","boolean","date","uuid","json"]),
  required: z.boolean().default(false),
  description: z.string().optional(),
});

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  attributes: z.array(AttributeSchema).default([]),
  description: z.string().optional(),
});

export const RelationSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  name: z.string().optional(),
  multiplicity: z.object({
    source: z.string().default("1"),
    target: z.string().default("1"),
  }).default({ source: "1", target: "1" }),
});

export const DomainModelSchema = z.object({
  classes: z.array(ClassSchema),
  relations: z.array(RelationSchema),
});
export type Attribute = z.infer<typeof AttributeSchema>;
export type ClassDef = z.infer<typeof ClassSchema>;
export type RelationDef = z.infer<typeof RelationSchema>;
export type DomainModel = z.infer<typeof DomainModelSchema>;
