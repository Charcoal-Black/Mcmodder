import { ProgressBar } from "./ProgressBar";

export class ExperienceBar extends ProgressBar {
  constructor(value: number, min: number, max: number) {
    super(value, min, max);
  }
}