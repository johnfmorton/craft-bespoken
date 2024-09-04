export function startJobMonitor(jobId, bespokenJobId, progressComponent, filename, button, actionUrlBase){
    console.log('startJobMonitor');
    const interval = setInterval(() => {
        const data = {
            jobId: jobId,
            bespokenJobId: bespokenJobId,
            filename: filename,
            progressComponent: progressComponent,
            button: button,
            interval: interval,
            actionUrl: actionUrlBase + '/job-status'
        }
        console.log('data', data);

        const resultOfJobCheck = checkBespokenJobStatus(actionUrlBase + '/job-status', bespokenJobId);

        // fetch(actionUrlBase + '/job-status', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data),
        // })
        // .then(response => response.json())
        // .then(data => {
        //     const { status, progress, progressLabel } = data;
        //     if (status === 'waiting') {
        //         updateProgress(0.1, 'Job is waiting...', progressComponent);
        //     } else if (status === 'reserved') {
        //         const message = progressLabel || 'Job is reserved...';
        //         updateProgress(progress * 0.01, message, progressComponent);
        //     } else if (status === 'done' && filename) {
        //         updateProgress(1, `Job is complete: ${filename}`, progressComponent);
        //         button.classList.remove('disabled');
        //         clearInterval(interval);
        //     } else {
        //         updateProgress(0, 'Job failed. Please check logs.', progressComponent);
        //         clearInterval(interval);
        //     }
        // });
    }, 1000);
}

// THIS IS NOT DONE. I need to check the job status controller and see how it's working. I also don't have the async await syntax down yet.
function checkBespokenJobStatus(url: string, bespokenJobId: string) {
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: bespokenJobId }),
    })
    .then(response => response.json())
}