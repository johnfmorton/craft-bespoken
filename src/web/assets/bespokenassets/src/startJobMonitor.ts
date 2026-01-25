import { ProgressComponent } from "./progress-component-v2";
import { updateProgressComponent} from "./updateProgressComponent";

const pollingInterval = 1000;

// Maximum time to wait for a pending job to start (3 minutes)
const maxPendingWaitTime = 180000;
// Maximum number of polls after job has started running (100 polls = ~100 seconds)
const maxRunningPolls = 100;

let howManyTimes = 0;
let pendingStartTime: number | null = null;
let runningPollCount = 0;

export function startJobMonitor(bespokenJobId: string, progressComponent: ProgressComponent, button: HTMLButtonElement, actionUrlJobStatus: string){
    console.log('startJobMonitor', bespokenJobId);

    // Reset counters for new job
    howManyTimes = 0;
    pendingStartTime = null;
    runningPollCount = 0;

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

            // Sanitize incoming values so updateProgressComponent never receives undefined
            const rawProgress = (responseData as any)?.progress;
            const normalizedProgress = typeof rawProgress === 'number'
              ? rawProgress
              : Number(rawProgress ?? 0);
            const safeProgress = Number.isFinite(normalizedProgress) ? normalizedProgress : 0;

            const safeSuccess = Boolean((responseData as any)?.success);
            const rawMessage = (responseData as any)?.message;
            const safeMessage = rawMessage == null ? '' : String(rawMessage);
            const status = (responseData as any)?.status ?? 'unknown';

            // Handle pending state - job hasn't started yet in the queue
            if (status === 'pending') {
                if (pendingStartTime === null) {
                    pendingStartTime = Date.now();
                }

                const pendingDuration = Date.now() - pendingStartTime;

                // Show user-friendly message while waiting for queue
                try {
                    updateProgressComponent(progressComponent, {
                        progress: 0,
                        success: true,
                        message: 'Waiting for queue to process job...',
                        textColor: 'rgb(89, 102, 115)'
                    });
                } catch (e) {
                    console.error(`updateProgressComponent failed: ${_toMessage(e)}`);
                }

                // Only timeout if we've been waiting too long for a pending job
                if (pendingDuration > maxPendingWaitTime) {
                    clearInterval(interval);
                    button.classList.remove('disabled');
                    updateProgressComponent(progressComponent, {
                        progress: 0,
                        success: false,
                        message: 'Job timed out waiting in queue. Please check your queue listener.',
                        textColor: 'rgb(126,7,7)'
                    });
                }

                // Don't count pending polls against the running limit
                return;
            }

            // Job has started running - reset pending tracking
            if (pendingStartTime !== null) {
                pendingStartTime = null;
            }
            runningPollCount++;

            try {
              updateProgressComponent(progressComponent, {
                progress: safeProgress,
                success: safeSuccess,
                message: safeMessage,
                textColor: safeSuccess ? 'rgb(89, 102, 115)' : 'rgb(126,7,7)'
              });
            } catch (e) {
              console.error(`updateProgressComponent failed: ${_toMessage(e)}`);
            }

            // if progress has reached completion, clear the interval
            if (safeProgress >= 1) {
                clearInterval(interval);
                // Re-enable the button
                button.classList.remove('disabled');
            }

            // Check for running poll limit (only counts after job starts running)
            if (runningPollCount >= maxRunningPolls && safeProgress < 1) {
                clearInterval(interval);
                button.classList.remove('disabled');
                updateProgressComponent(progressComponent, {
                    progress: safeProgress,
                    success: false,
                    message: 'Job monitoring timed out. The job may still be processing.',
                    textColor: 'rgb(126,7,7)'
                });
            }

        } catch (error) {
            // I don't clear the interval here because I want to keep polling the API
            // because the first few requests might have failed because processing has not started yet
            // so the only clear the interval when the howManyTimes is 100

            // check if error is a string
            console.error(`Error fetching job status: ${_toMessage(error)}`);
            console.error("Error mentioning 'toString' often mean the API call failed to ElevenLabs and does not indicate a problem with the job queue.");
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

function _toMessage(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  if (typeof err === 'string') return err;
  if (err === null) return 'null';
  if (typeof err === 'undefined') return 'undefined';
  try {
    const json = JSON.stringify(err);
    return typeof json === 'string' ? json : String(err);
  } catch {
    // Fallback for circular structures or unexpected values
    try {
      return String(err);
    } catch {
      return '[Unstringifiable error]';
    }
  }
}
