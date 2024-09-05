import { jobStatusCheckInputData, JobStatusResult } from './interfaces';


// this is wrong, but structurally correct
// I'm switching to using Craft::$app->cache->set("jobStatus-{$bespokenJobId}", 'running', $this->cacheExpire); in the plugin instead of checking the jobId status directly
// this means rebuilding the JS code to use the cache instead of the API
// this version is a first step in that direction before I leave for Iceland

// there will be a lot of changes to the JS code to make this work

// For example, look in the GenerateAudio job in the plugin
// there is a jobStatus-{$bespokenJobId} cache key that is set to 'running' when the job starts
// there is also a jobMessage-{$bespokenJobId} cache key that will change based on the job status
// I need to use a function like you see below to check for "running" or "completed" or "failed" in the cache
// and return the appropriate progress and message

// the parent function will need to pass the data around to the setProgress function, which still ened to be written

export async function checkBespokeJobStatus(data: jobStatusCheckInputData ): Promise<JobStatusResult> {
  return fetch(data.actionUrl + '/check-job-number', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobId: data.jobId
    }),
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      const { status, progress, progressLabel } = data;

      if (status === 'waiting') {
        const returnData: JobStatusResult = {
          success: true,
          progress: 0.1,
          message: 'Job is waiting...',
        };
        return returnData;
      } else if (status === 'reserved') {
        // if progressLabel is empty, use the default message of "waiting..."
        const message = progressLabel || 'Job is reserved...';

        const returnData: JobStatusResult = {
          success: true,
          progress: 0.2,
          message: message,
        };
        return returnData;
      } else if (status === 'running') {
        const returnData: JobStatusResult = {
          success: true,
          progress: progress,
          message: progressLabel,
        };
        return returnData;
      } else if (status === 'completed') {
        const returnData: JobStatusResult = {
          success: true,
          progress: 1,
          message: 'Job is completed.',
        };
        return returnData;
      } else if (status === 'failed') {
        const returnData: JobStatusResult = {
          success: true,
          progress: 0,
          message: 'Job failed.',
        };
        return returnData;
      } else {
        // Handle unexpected statuses if necessary
        const returnData: JobStatusResult = {
          success: false,
          progress: 0,
          message: 'Unknown job status.',
        };
        return returnData;
      }
    })
    .catch(error => {
      const returnData: JobStatusResult = {
        success: false,
        progress: 0,
        message: 'Error during API request.',
      };
      return returnData;
    });
}