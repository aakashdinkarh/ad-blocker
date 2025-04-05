// Common ad-related selectors
const AD_SELECTORS = [
    // Generic ad classes and IDs
    '[class*="ad-"]:not(html):not(body)',
    '[class*="ads-"]:not(html):not(body)',
    '[class*="advertisement"]:not(html):not(body)',
    '[id*="ad-"]:not(html):not(body)',
    '[id*="ads-"]:not(html):not(body)',
    
    // Common ad containers
    '.ad-container',
    '.ad-wrapper',
    '.sponsored-content',
    '.sponsored-ad',
    '.advertisement',
    
    // Google Ads specific
    'ins.adsbygoogle',
    '.adsbygoogle',
    'div[id^="google_ads_"]',
    'div[id^="div-gpt-ad"]',
    
    // Social media and common ad providers
    '[aria-label*="advertisement"]',
    '[data-ad]',
    '[data-native-ad]',
    '[data-ad-container]'
];

// YouTube ad detection settings
let youtubeSettings = {
    adShowingClass: 'ad-showing'
};

// Function to skip ad when detected
function skipAd() {
    const moviePlayer = document.querySelector('#movie_player');
    if (!moviePlayer) {
        return;
    }
    const video = moviePlayer.querySelector('video');
    if (!video) {
        return;
    }
    const skipButton = moviePlayer.querySelector('.ytp-skip-ad-button');
    
    const adPlaying = moviePlayer.classList.contains(youtubeSettings.adShowingClass);
    console.log(adPlaying);

    // Try to skip if button exists
    if (skipButton) {
        debugger;
        skipButton.click();
        console.log('skipped called');
    }
    if (video && video.duration > 0 && adPlaying) {
        video.currentTime = video.duration;
    }
}

// Function to handle YouTube video ads
function handleYouTubeAds() {
    // Only run on YouTube domains
    if (!window.location.hostname.includes('youtube.com')) {
        return;
    }
    skipAd();
}

// Function to remove ads from the page
function removeAds() {
    let removedCount = 0;
    
    AD_SELECTORS.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.remove();
            removedCount++;
        });
    });

    if (removedCount > 0) {
        // Notify background script about removed ads
        chrome.runtime.sendMessage({
            type: 'ADS_REMOVED',
            count: removedCount
        });
    }
}

// Function to observe DOM changes for dynamically loaded ads
function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
        let shouldRemoveAds = false;
        
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                shouldRemoveAds = true;
            }
        });

        if (shouldRemoveAds) {
            // removeAds();
            handleYouTubeAds(); // Focus on YouTube ads
        }
    });

    // Ensure we have a body to observe
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        // If body isn't available yet, wait for it
        const bodyObserver = new MutationObserver(() => {
            if (document.body) {
                bodyObserver.disconnect();
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        });

        // Observe document for body creation
        bodyObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
}

// Load YouTube settings
async function loadYouTubeSettings() {
    try {
        const { youtubeSettings: settings = { adShowingClass: 'ad-showing' } } = 
            await chrome.storage.sync.get('youtubeSettings');
        youtubeSettings = settings;
    } catch (error) {
        console.error('Error loading YouTube settings:', error);
    }
}

// Listen for settings updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'YOUTUBE_SETTINGS_UPDATED') {
        youtubeSettings = message.settings;
    } else if (message.type === 'TOGGLE_PROTECTION') {
        if (message.isEnabled) {
            // removeAds();
            observeDOMChanges();
            handleYouTubeAds();
        } else {
            // If needed, could reload the page to restore ads
            // window.location.reload();
        }
    }
});

// Initialize with settings
async function initialize() {
    try {
        const { isEnabled = true } = await chrome.storage.sync.get('isEnabled');
        if (isEnabled) {
            // Load YouTube settings first
            await loadYouTubeSettings();
            
            // Initial cleanup
            if (document.body) {
                // removeAds();
                handleYouTubeAds();
            }
            // Watch for dynamic content and handle YouTube ads
            observeDOMChanges();
        }
    } catch (error) {
        console.error('Error initializing content script:', error);
    }
}

// Listen for toggle changes from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_PROTECTION') {
        if (message.isEnabled) {
            // removeAds();
            observeDOMChanges();
            handleYouTubeAds();
        } else {
            // If needed, could reload the page to restore ads
            // window.location.reload();
        }
    }
});

// Start the ad blocking
initialize(); 