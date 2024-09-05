import { checkBespokeJobStatus} from "./checkBespokeJobStatus";
import { ProgressComponent } from "./progress-component";

const pollingInterval = 1000;

export function startJobMonitor(jobId: string, bespokenJobId: string, progressComponent: ProgressComponent, filename: string, button: HTMLButtonElement, actionUrlBase: string){
    console.log('startJobMonitor', bespokenJobId);
    const interval = setInterval(async () => {
        const data = {
            jobId: jobId,
            bespokenJobId: bespokenJobId,
            filename: filename,
            progressComponent: progressComponent,
            button: button,
            interval: interval,
            actionUrl: actionUrlBase + '/job-status'
        }
        // console.log('data', data);

        const url = `${actionUrlBase}/job-status?jobId=${bespokenJobId}`;
        console.log('url', url);
        debugger;

        const result = await fetch(`${actionUrlBase}/job-status?jobId=${bespokenJobId}`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        })

        // Assuming the response is in JSON format
        const data = await result.json();

        console.log('result', data);

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