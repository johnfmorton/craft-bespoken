import { checkBespokeJobStatus} from "./checkBespokeJobStatus";
import { ProgressComponent } from "./progress-component";

const pollingInterval = 1000;

export function startJobMonitor(jobId: string, bespokenJobId: string, progressComponent: ProgressComponent, filename: string, button: HTMLButtonElement, actionUrlBase: string){
    console.log('startJobMonitor', bespokenJobId);
    const interval = setInterval(async () => {
        // const data = {
        //     jobId: jobId,
        //     bespokenJobId: bespokenJobId,
        //     filename: filename,
        //     progressComponent: progressComponent,
        //     button: button,
        //     interval: interval,
        //     actionUrl: actionUrlBase + '/job-status'
        // };
        // Removed unused console.log for 'data' as it's not required here.

        const url = `${actionUrlBase}/job-status&jobId=${bespokenJobId}`;
        console.log('url', url);

        try {
            const result = await fetch(url, {
                method: 'GET',
                headers: {'Content-Type': 'application/json'}
            });

            // Check if the response is ok (status code 200-299)
            if (!result.ok) {
                throw new Error(`HTTP error! Status: ${result.status}`);
            }

            // Assuming the response is in JSON format
            const responseData = await result.json();

            console.log('result', responseData);

            // Optionally, handle the response data here to update the UI, progress bar, etc.

        } catch (error) {
            console.error('Error fetching job status:', error);
            // Optionally clear interval or take some action if there is an error
        }

    }, pollingInterval);
}

// THIS IS NOT DONE. I need to check the job status controller and see how it's working. I also don't have the async await syntax down yet.
// async function checkBespokenJobStatus(url: string, bespokenJobId: string) {
//     fetch(url, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ jobId: bespokenJobId }),
//     })
//     .then(response => response.json())
// }