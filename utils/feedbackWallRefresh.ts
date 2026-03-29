let feedbackWallRefreshSignal = 0;

export function triggerFeedbackWallRefresh() {
  feedbackWallRefreshSignal = Date.now();
}

export function getFeedbackWallRefreshSignal() {
  return feedbackWallRefreshSignal;
}
