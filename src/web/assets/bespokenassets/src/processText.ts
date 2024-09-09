import {updateProgressComponent} from "./updateProgressComponent";
import {ProgressComponent} from "./progress-component-v2";
import {startJobMonitor} from "./startJobMonitor";

export function processText(
    text: string,
    title: string,
    voiceId: string,
    elementId: string,
    fileNamePrefix: string,
    progressComponent: ProgressComponent,
    button: HTMLButtonElement,
    actionUrlProcessText: string
): void {

    // const actionUrlProcessText: string = `${actionUrlBase}/process-text`;

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
    if (!actionUrlProcessText) {
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

    fetch(actionUrlProcessText, {
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

            // we have the original Action URL of the process-text function
            // it will look something like this:
            // https://example.com/index.php/admin/actions/bespoken/bespoken/process-text?site=default
            // https://example.com/index.php?p=admin/actions/bespoken/bespoken/process-text
            const actionUrlJobStatus = _updateProcessTextActionUrl( actionUrlProcessText, `job-status&jobId=${bespokenJobId}`);


            // look in the startJobMonitor function to see how
            // the progress is updated
            startJobMonitor(bespokenJobId, progressComponent, button, actionUrlJobStatus);
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

function _updateProcessTextActionUrl(url: string, newString: string): string {
;
    // Create a URL object to easily manipulate URL parts
    const urlObj = new URL(url);

    // Extract the href part of the URL object
    let href: string = urlObj.href;

    // Replace 'process-text' with the provided new string
    href = href.replace('process-text', newString);

    // Update the URL object with the modified href
    urlObj.href = href;

    // Return the modified URL as a string
    return urlObj.toString();
}