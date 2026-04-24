const { StringField, NumberField, BooleanField, SchemaField } = foundry.data.fields;

// fvtt-types v13 requires 2-4 type arguments for TypeDataModel; use unknown cast
// to avoid specifying Schema/Parent generics until DataModelConfig migration is complete.
export class FranchiseDataModel extends (foundry.abstract.TypeDataModel as unknown as new () => object) {
  static defineSchema(): Record<string, unknown> {
    return {
      description: new StringField({ required: true, initial: "" }),
      cards: new SchemaField({
        library: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        gym: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        credit: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      }),
      bank: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      missionPool: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      missionGoal: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      missionStartDay: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      debtMode: new BooleanField({ required: true, initial: false }),
      loanAmount: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      cardsLocked: new BooleanField({ required: true, initial: false }),
      deathMode: new BooleanField({ required: true, initial: false }),
    };
  }
}
