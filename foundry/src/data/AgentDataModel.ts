const { StringField, NumberField, BooleanField, ArrayField, SchemaField } = foundry.data.fields;

// fvtt-types v13 requires 2-4 type arguments for TypeDataModel; use AnyTypeDataModel
// to avoid specifying Schema/Parent generics until DataModelConfig migration is complete.
export class AgentDataModel extends (foundry.abstract.TypeDataModel as unknown as new () => object) {
  static defineSchema(): Record<string, unknown> {
    return {
      description: new StringField({ required: true, initial: "" }),
      skills: new SchemaField({
        academics: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 4, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
        athletics: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 4, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
        technology: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 4, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
        contact: new SchemaField({
          base: new NumberField({ required: true, integer: true, min: 0, max: 4, initial: 2 }),
          penalty: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        }),
      }),
      talent: new StringField({ required: true, initial: "" }),
      cool: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      isWeird: new BooleanField({ required: true, initial: false }),
      power: new SchemaField({
        name: new StringField({ required: true, initial: "" }),
        description: new StringField({ required: true, initial: "" }),
        baseSkill: new StringField({ required: true, initial: "athletics" }),
        coolCost: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
      }, { required: false, initial: null }),
      characteristics: new ArrayField(new SchemaField({
        text: new StringField({ required: true, initial: "" }),
        used: new BooleanField({ required: true, initial: false }),
      })),
      missionPool: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
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
    (this as unknown as { prepareBaseData: () => void }).prepareBaseData?.call(Object.getPrototypeOf(Object.getPrototypeOf(this)));
    // Enforce skill range based on weird agent status
    const isWeird = (this as unknown as { isWeird: boolean }).isWeird;
    const maxSkill = isWeird ? 10 : 4;
    const skillKeys = ["academics", "athletics", "technology", "contact"] as const;
    const skills = (this as unknown as { skills: Record<string, { base: number; penalty: number }> }).skills;

    if (skills) {
      for (const skillKey of skillKeys) {
        if (skills[skillKey]) {
          skills[skillKey].base = Math.min(skills[skillKey].base, maxSkill);
        }
      }
    }
  }
}
