export const DEFAULT_RECENT_MESSAGES_WINDOW = 20;
export const DEFAULT_SUMMARY_BATCH_SIZE = 10;

export const getConversationWindowPlan = (
    messageCount,
    summarizedCount = 0,
    {
        recentMessagesWindow = DEFAULT_RECENT_MESSAGES_WINDOW,
        summaryBatchSize = DEFAULT_SUMMARY_BATCH_SIZE
    } = {}
) => {
    const safeMessageCount = Math.max(0, Number(messageCount) || 0);
    const safeSummarizedCount = Math.min(
        safeMessageCount,
        Math.max(0, Number(summarizedCount) || 0)
    );
    const messagesEligibleForSummary = Math.max(
        0,
        safeMessageCount - recentMessagesWindow
    );
    const targetSummaryCount = Math.floor(
        messagesEligibleForSummary / summaryBatchSize
    ) * summaryBatchSize;

    return {
        targetSummaryCount,
        nextSummaryStart: Math.min(safeSummarizedCount, targetSummaryCount),
        nextSummaryEnd: targetSummaryCount,
        recentStart: targetSummaryCount,
        recentCount: safeMessageCount - targetSummaryCount
    };
};
