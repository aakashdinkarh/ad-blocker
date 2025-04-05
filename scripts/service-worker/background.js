// Initialize storage with default values
chrome.runtime.onInstalled.addListener(async () => {
    try {
        const today = new Date().toDateString();
        await chrome.storage.local.set({
            todayBlocked: 0,
            totalBlocked: 0,
            lastDate: today,
            isEnabled: true
        });
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ADS_REMOVED') {
        // We need to return true if we're going to send a response asynchronously
        handleAdsRemoved(message.count);
        return true;
    }
});

// Handle ads removed message
async function handleAdsRemoved(count) {
    try {
        // Get current statistics
        const stats = await chrome.storage.local.get(['todayBlocked', 'totalBlocked', 'lastDate']);
        const today = new Date().toDateString();
        
        // Reset daily count if it's a new day
        if (stats.lastDate !== today) {
            stats.todayBlocked = 0;
            stats.lastDate = today;
        }
        
        // Update counts
        const newTodayBlocked = (stats.todayBlocked || 0) + count;
        const newTotalBlocked = (stats.totalBlocked || 0) + count;
        
        // Save updated statistics
        await chrome.storage.local.set({
            todayBlocked: newTodayBlocked,
            totalBlocked: newTotalBlocked,
            lastDate: today
        });
        
        // Broadcast to all extension contexts
        chrome.runtime.sendMessage({
            type: 'STATS_UPDATED',
            todayBlocked: newTodayBlocked,
            totalBlocked: newTotalBlocked
        }).catch(() => {
            // Ignore errors when popup is not open
        });
    } catch (error) {
        console.error('Error updating ad block statistics:', error);
    }
} 