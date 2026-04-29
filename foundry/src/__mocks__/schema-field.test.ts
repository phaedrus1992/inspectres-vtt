import { describe, it, expect, beforeEach } from "vitest";

describe("Mock SchemaField validation", () => {
  let SchemaField: (typeof globalThis.foundry.data.fields)["SchemaField"];

  beforeEach(() => {
    const { foundry } = globalThis as unknown as { foundry: typeof global.foundry };
    SchemaField = foundry.data.fields.SchemaField;
  });

  it("throws when initial is null without nullable: true", () => {
    expect(() => {
      new SchemaField(
        {},
        { initial: null, nullable: false },
      );
    }).toThrow("initial: null requires nullable: true");
  });

  it("throws when initial is null and nullable is not specified", () => {
    expect(() => {
      new SchemaField({}, { initial: null });
    }).toThrow("initial: null requires nullable: true");
  });

  it("accepts initial: null when nullable: true", () => {
    expect(() => {
      new SchemaField({}, { initial: null, nullable: true });
    }).not.toThrow();
  });

  it("accepts other initial values without nullable", () => {
    expect(() => {
      new SchemaField({}, { initial: "default", nullable: false });
    }).not.toThrow();

    expect(() => {
      new SchemaField({}, { initial: 0, nullable: false });
    }).not.toThrow();
  });
});
