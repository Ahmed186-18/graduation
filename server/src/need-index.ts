export type AttributeKey =
  | "familySize"
  | "numberOfStudents"
  | "elderlyCount"
  | "childrenCount"
  | "femaleCount";

export type Weights = Partial<Record<AttributeKey, number>>;

export interface NeedInput {
  familySize: number;
  numberOfStudents: number;
  elderlyCount: number;
  childrenCount: number;
  femaleCount: number;
}

export interface NeedIndexResult {
  score: number;
  priority: "high" | "medium" | "low";
}

export function calculateNeedIndex(
  input: NeedInput,
  weights: Weights,
  thresholds: { high: number; medium: number }
): NeedIndexResult {
  const attributeValues: Record<AttributeKey, number> = {
    familySize: input.familySize,
    numberOfStudents: input.numberOfStudents,
    elderlyCount: input.elderlyCount,
    childrenCount: input.childrenCount,
    femaleCount: input.femaleCount,
  };

  let score = 0;
  for (const key of Object.keys(weights) as AttributeKey[]) {
    const weight = weights[key] ?? 0;
    const value = attributeValues[key] ?? 0;
    score += value * weight;
  }

  let priority: NeedIndexResult["priority"] = "low";
  if (score >= thresholds.high) priority = "high";
  else if (score >= thresholds.medium) priority = "medium";

  return { score, priority };
}

export const defaultWeights: Weights = {
  familySize: 2,
  numberOfStudents: 3,
  elderlyCount: 4,
  childrenCount: 3,
  femaleCount: 2,
};

export const defaultThresholds = { high: 12, medium: 6 };


