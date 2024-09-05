import {updateProgressComponent} from "./updateProgressComponent";
import {ProgressComponent} from "./progress-component";

import {startJobMonitor} from "./startJobMonitor";

export function processText(
    text: string,
    title: string,
    actionUrl: string,
    voiceId: string,
    elementId: string,
    fileNamePrefix: string,
    progressComponent: ProgressComponent,
    button: HTMLButtonElement,
    actionUrlBase: string
): void {
    updateProgressComponent(progressComponent, {
        progress: 0.11,
        success: true,
        message: 'Generating audio...',
        textColor: 'rgb(89, 102, 115)'
    });

    // check to see if the text is empty
    if (!text) {
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'No text to generate audio from.',
            textColor: 'rgb(126,7,7)'
        });
        button.classList.remove('disabled');
        return;
    }

    // check to see if the actionUrl is empty
    if (!actionUrl) {
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'No action URL to send the text to.',
            textColor: 'rgb(126,7,7)'
        });
        button.classList.remove('disabled');
        return;
    }

    // check to see if the voiceId is empty
    if (!voiceId) {
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'No voice selected.',
            textColor: 'rgb(126,7,7)'
        });
        button.classList.remove('disabled');
        return;
    }

    const data = {text, voiceId, entryTitle: title, fileNamePrefix, elementId};

    updateProgressComponent(progressComponent, {
        progress: 0.15,
        success: true,
        message: 'Sending data to API',
        textColor: 'rgb(89, 102, 115)'
    });

    fetch(actionUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(data => {
            const {filename, jobId, bespokenJobId, success, message} = data;

            if (!success) {
                updateProgressComponent(progressComponent, {
                    progress: 0,
                    success: false,
                    message: message || 'Error during API request.',
                    textColor: 'rgb(126,7,7)'
                });
                button.classList.remove('disabled');
                return;
            }

            // look in the startJobMonitor function to see how the progress is updated
            startJobMonitor(bespokenJobId, progressComponent, button, actionUrlBase);
        })
        .catch(error => {
            updateProgressComponent(progressComponent, {
                progress: 0,
                success: false,
                message: 'Error during API request.',
                textColor: 'rgb(126,7,7)'
            });
        });

}