export function generateText(
  text: string,
  actionUrl: RequestInfo | URL,
  voiceId: string,
  entryTitle: string,
    fileNamePrefix: string | null,
  elementId: string,
  progressComponent: HTMLElement,
  button: HTMLElement
): void {
  if (!text) return handleError('Text is empty. There is no audio to generate.', progressComponent);
  if (!actionUrl) return handleError('The actionUrl is empty. There is no action to call.', progressComponent);
  if (!voiceId) return handleError('The voiceId is empty. There is no voice to send to the API.', progressComponent);

  // Generate a random number from 0 to 1000000 to be used in the queue system for status updates
  let jobId: number;
  jobId = Math.floor(Math.random * 1000000);

  const data = { text, voiceId, entryTitle: cleanTitle(entryTitle), fileNamePrefix, elementId };

  updateProgress(0.1, 'Sending text to API...', progressComponent);

  fetch(actionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .then(data => {
      // check for success
      if (data.success === false) {
        const errorMessage = data.message || 'Error during API request.';

        // debugger;
        handleError(errorMessage, progressComponent);
        // logError(`Error during API request: ${data.message}`);
        return;
      }

      const { filename, jobId } = data;
      startJobMonitor(jobId, progressComponent, filename, button);
    })
    .catch(error => {
      debugger;
        handleError('Error during API request.', progressComponent);
      logError(`Error during API request: ${error}`);
    });
}
