import {ProgressComponent} from "./progress-component";

export function updateProgressComponent(progressComponent: ProgressComponent, { progress, success, message, textColor = 'rgb(89, 102, 115)' }) {
  // if text color is not provided, use the default value
    if (!textColor) {
        textColor = 'rgb(89, 102, 115)';
    }

  progressComponent.setAttribute('progress', progress.toString());
  progressComponent.setAttribute('success', success);
  progressComponent.setAttribute('message', message);

  // Set the custom CSS property for text color
  progressComponent.style.setProperty('--progress-text-color', textColor);
}