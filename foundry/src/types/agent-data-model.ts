import { fields } from "fvtt-types";

export class AgentSkillField extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      base: new fields.NumberField({ required: true, initial: 2, min: 0, max: 6 }),
      penalty: new fields.NumberField({ required: true, initial: 0, min: 0, max: 6 }),
    };
  }
}

export class AgentCharacteristicField extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      text: new fields.StringField({ required: true, initial: "", blank: true }),
      used: new fields.BooleanField({ required: true, initial: false }),
    };
  }
}

export class AgentDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ required: true, initial: "", blank: true }),
      skills: new fields.SchemaField(
        {
          academics: new fields.EmbeddedDataField(AgentSkillField, { required: true }),
          athletics: new fields.EmbeddedDataField(AgentSkillField, { required: true }),
          technology: new fields.EmbeddedDataField(AgentSkillField, { required: true }),
          contact: new fields.EmbeddedDataField(AgentSkillField, { required: true }),
        },
        { required: true }
      ),
      talent: new fields.StringField({ required: true, initial: "", blank: true }),
      cool: new fields.NumberField({ required: true, initial: 0, min: 0, max: 6 }),
      isWeird: new fields.BooleanField({ required: true, initial: false }),
      characteristics: new fields.ArrayField(
        new fields.EmbeddedDataField(AgentCharacteristicField),
        { required: true }
      ),
      missionPool: new fields.NumberField({ required: true, initial: 0, min: 0 }),
    };
  }
}
