import { McmodderTextInput } from "./TextInput";

export class McmodderColorpickerInput extends McmodderTextInput {
  protected override getInstanceHTML() {
    return $(`
      <input type="color" class="form-control">
    `);
  }
}