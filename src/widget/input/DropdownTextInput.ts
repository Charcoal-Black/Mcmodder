import { InputSimplifiedRecommendation, InputSuccessfulChangeCallBack } from "../../types";
import { InputList } from "../InputList";
import { McmodderTextInput } from "./TextInput";

export class McmodderDropdownTextInput extends McmodderTextInput {
  
  protected recommendation: InputSimplifiedRecommendation[];
  protected inputList: InputList;

  constructor(title: string, value: string, recommendation: InputSimplifiedRecommendation[],
              onSuccessfulChange: InputSuccessfulChangeCallBack<string>) {
    super(title, value, onSuccessfulChange);
    this.recommendation = recommendation;
    this.inputList = new InputList(this.getInputNode(), () => this.recommendation);
  }

  override getInstance() {
    return this.inputList.getInstance();
  }
}