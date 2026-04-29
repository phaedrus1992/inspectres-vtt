import { describe, it, expect } from "vitest";

describe("Mock SchemaField validation", () => {
  it("throws when initial is null without nullable: true", () => {
    const { foundry } = globalThis as unknown as { foundry: typeof global.foundry };
    const { SchemaField } = foundry.data.fields;

    expect(() => {
      new SchemaField(
        {},
        { initial: null, nullable: false },
      );
    }).toThrow("initial: null requires nullable: true");
  });

  it("throws when initial is null and nullable is not specified", () => {
    const { foundry } = globalThis as unknown as { foundry: typeof global.foundry };
    const { SchemaField } = foundry.data.fields;

    expect(() => {
      new SchemaField({}, { initial: null });
    }).toThrow("initial: null requires nullable: true");
  });

  it("accepts initial: null when nullable: true", () => {
    const { foundry } = globalThis as unknown as { foundry: typeof global.foundry };
    const { SchemaField } = foundry.data.fields;

    expect(() => {
      new SchemaField({}, { initial: null, nullable: true });
    }).not.toThrow();
  });

  it("accepts other initial values without nullable", () => {
    const { foundry } = globalThis as unknown as { foundry: typeof global.foundry };
    const { SchemaField } = foundry.data.fields;

    expect(() => {
      new SchemaField({}, { initial: "default", nullable: false });
    }).not.toThrow();

    expect(() => {
      new SchemaField({}, { initial: 0, nullable: false });
    }).not.toThrow();
  });
});
