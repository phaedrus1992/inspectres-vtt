const { StringField, NumberField, BooleanField, ArrayField, SchemaField } = foundry.data.fields;

// TypeDataModel base class cast: Foundry's abstract class requires unknown intermediate
// to satisfy TypeScript's type constraints until TypeDataModel v14+ fully types the class.
// This is a boundary cast (justified by Foundry V2 API structure) not a workaround.
type TypeDataModelBase = new () => object;
const TypeDataModelBase: TypeDataModelBase = foundry.abstract.TypeDataModel as unknown as TypeDataModelBase;

export class AgentDataModel extends TypeDataModelBase {
  static defineSchema(): Record<string, unknown> {
    return {
      description: new StringField({ required: true, initial: "" }),
      skills: new SchemaField({
        academics: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 10, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
        athletics: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 10, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
        technology: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 10, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
        contact: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 10, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
      }),
      talent: new StringField({ required: true, initial: "" }),
      cool: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      isWeird: new BooleanField({ required: true, initial: false }),
      power: new SchemaField({
        name: new StringField({ required: true, initial: "" }),
        description: new StringField({ required: true, initial: "" }),
        baseSkill: new StringField({ required: true, choices: ["athletics", "contact"], initial: "athletics" }),
        coolCost: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
      }, { required: false, initial: null }),
      characteristics: new ArrayField(new SchemaField({
        text: new StringField({ required: true, initial: "" }),
        used: new BooleanField({ required: true, initial: false }),
      })),
      stress: new NumberField({ required: true, integer: true, min: 0, max: 6, initial: 0 }),
      isDead: new BooleanField({ required: true, initial: false }),
      daysOutOfAction: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      recoveryStartedAt: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    };
  }

  static migrateData(source: Record<string, unknown>): Record<string, unknown> {
    // Schema v0→v1: recoveryStartedAt changed from ISO string to in-game day number (v0.1.1)
    // Legacy agents have a string from `new Date().toISOString()`. Normalize to 0 (inactive).
    // When recovery is active (daysOutOfAction > 0), the day gets seeded on next roll evaluation.
    if (typeof source["recoveryStartedAt"] === "string") {
      source["recoveryStartedAt"] = 0;
    }

    return source;
  }

  prepareBaseData(): void {
    // Call parent's prepareBaseData if it exists (TypeDataModel may not override it)
    const parent = Object.getPrototypeOf(this.constructor.prototype);
    (parent.prepareBaseData as ((this: this) => void) | undefined)?.call(this);
    // Enforce skill range based on weird agent status
    const isWeird = (this as unknown as { isWeird: boolean }).isWeird;
    const maxSkill = isWeird ? 10 : 4;
    const skillKeys = ["academics", "athletics", "technology", "contact"] as const;
    const skills = (this as unknown as { skills: Record<string, { base: number; penalty: number }> }).skills;

    if (skills) {
      for (const skillKey of skillKeys) {
        if (skills[skillKey] && skills[skillKey].base > maxSkill) {
          const actorName = (this as unknown as { name?: string }).name ?? "unknown";
          console.warn(
            `[INSPECTRES] Skill value ${skills[skillKey].base} exceeds max ${maxSkill} for ${isWeird ? "weird" : "normal"} agent (${skillKey}). Clamping to ${maxSkill}.`,
            { skillKey, currentValue: skills[skillKey].base, maxSkill, isWeird, actorName },
          );
          skills[skillKey].base = maxSkill;
        }
      }
    }
  }
}
