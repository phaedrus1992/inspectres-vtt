import { fields } from "fvtt-types";

export class FranchiseCardsField extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      library: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      gym: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      credit: new fields.NumberField({ required: true, initial: 0, min: 0 }),
    };
  }
}

export class FranchiseDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ required: true, initial: "", blank: true }),
      cards: new fields.EmbeddedDataField(FranchiseCardsField, { required: true }),
      bank: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      missionPool: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      missionGoal: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      debtMode: new fields.BooleanField({ required: true, initial: false }),
      loanAmount: new fields.NumberField({ required: true, initial: 0, min: 0 }),
    };
  }
}
