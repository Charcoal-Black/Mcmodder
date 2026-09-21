import { FieldIndex } from "./FieldIndex";

export class RecipeFieldIndex extends FieldIndex<Recipe> {
  constructor() {
    super("out_id", (outputs: Record<string, string>) => {
      return Object.values(outputs);
    });
  }
}