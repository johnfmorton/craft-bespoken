import { ProgressComponent } from "./progress-component-v2";
import { updateProgressComponent} from "./updateProgressComponent";

const pollingInterval = 1000;

let howManyTimes = 0;

export function startJobMonitor(bespokenJobId: string, progressComponent: ProgressComponent, button: HTMLButtonElement, actionUrlJobStatus: string){
    console.log('startJobMonitor', bespokenJobId);
    const interval = setInterval(async () => {
        howManyTimes++;


        try {
            const result = await fetch(actionUrlJobStatus, {
                method: 'GET',
                headers: {'Content-Type': 'application/json'}
            });

            // Check if the response is ok (status code 200-299)
            if (!result.ok) {
                throw new Error(`HTTP error! Status: ${result.status}`);
            }

            // Assuming the response is in JSON format
            const responseData = await result.json();

            console.log('Audio creation status:', responseData);

            updateProgressComponent(progressComponent, {
                progress: responseData.progress,
                success: responseData.success,
                message: responseData.message,
                textColor: 'rgb(89, 102, 115)'
            });

            // if progress is 100, clear the interval
            if (responseData.progress === 1) {
                clearInterval(interval);
                // Re-enable the button
                button.classList.remove('disabled');
            }

        } catch (error) {
            // I don't clear the interval here because I want to keep polling the API
            // because the first few requests might have failed because processing has not started yet
            // so the only clear the interval when the howManyTimes is 100
            console.error('Error fetching job status:', error);
            if (howManyTimes === 100) {
                clearInterval(interval);
                // Re-enable the button
                button.classList.remove('disabled');
                updateProgressComponent(progressComponent, {
                    progress: 0,
                    success: false,
                    message: 'Error fetching job status. This may be an issue with the job queue.',
                    textColor: 'rgb(126,7,7)'
                });
            }

        }

    }, pollingInterval);
}


