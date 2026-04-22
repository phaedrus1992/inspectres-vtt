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
      characteristics: new ArrayField(new SchemaField({
        text: new StringField({ required: true, initial: "" }),
        used: new BooleanField({ required: true, initial: false }),
      })),
      missionPool: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    };
  }
}
