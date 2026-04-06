import { McmodderRecipeData } from "../types";
import { McmodderMap } from "./Map";

export class McmodderRecipeMap extends McmodderMap<McmodderRecipeData> {
  constructor() {
    super("out_id", (outputs: Record<string, string>) => {
      return Object.values(outputs);
    });
  }
}