export type jobStatusCheckInputData = {
    actionUrl: string;
    jobId: string;
}

export type JobStatusResult = {
  success: boolean;
  progress: number;
  message: string;
};


export type ClickHandlerResult = {
    success: boolean;
    message: string;
    progress?: number;
    voiceId?: string;
    title?: string;
    fileNamePrefix?: string;
    elementId?: string;
};
