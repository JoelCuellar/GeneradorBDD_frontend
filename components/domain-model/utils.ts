import type { DomainConstraintConfig, DomainMultiplicity } from "@/lib/api/domain-model";

export const renderMultiplicity = (multiplicity: DomainMultiplicity) => {
  switch (multiplicity) {
    case "UNO":
      return "1..1";
    case "CERO_O_UNO":
      return "0..1";
    case "UNO_O_MAS":
      return "1..";
    case "CERO_O_MAS":
      return "0..";
    default:
      return multiplicity;
  }
};

export const summarizeConfig = (config: DomainConstraintConfig) => {
  const parts: string[] = [];
  if (typeof config.lengthMin === "number") parts.push(`len >= ${config.lengthMin}`);
  if (typeof config.lengthMax === "number") parts.push(`len <= ${config.lengthMax}`);
  if (typeof config.min === "number") parts.push(`min ${config.min}`);
  if (typeof config.max === "number") parts.push(`max ${config.max}`);
  if (typeof config.scale === "number") parts.push(`scale ${config.scale}`);
  if (typeof config.precision === "number") parts.push(`prec ${config.precision}`);
  if (config.pattern) parts.push("patron");
  return parts.join(" | ") || "Sin restricciones";
};
