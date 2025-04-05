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

    // Use configurable class for ad detection
    const adPlaying = moviePlayer.classList.contains(youtubeSettings.adShowingClass);

    // Only proceed if there's actually an ad playing
    if (video && video.duration > 0 && adPlaying) {
        // If no skip button or it's not working, try to forward to end
        video.currentTime = video.duration;
    }
    // Try to skip if button exists
    if (skipButton) {
        skipButton.click();
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

// Function to remove ads from the page
function removeAds() {
    AD_SELECTORS.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.remove();
        });
    });
}

let observer;

// Function to observe DOM changes for dynamically loaded ads
function observeDOMChanges() {
    observer = new MutationObserver((mutations) => {
        let shouldRemoveAds = false;
        
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                shouldRemoveAds = true;
            }
        });

        if (shouldRemoveAds) {
            // removeAds();
            handleYouTubeAds();
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

// Listen for settings updates and storage changes
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'YOUTUBE_SETTINGS_UPDATED') {
        youtubeSettings = message.settings;
    }
});

function unobserveDOMChanges() {
    observer.disconnect();
}


// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        if (changes.isEnabled) {
            const isEnabled = changes.isEnabled.newValue;
            if (isEnabled) {
                // removeAds();
                observeDOMChanges();
                handleYouTubeAds();
            } else {
                unobserveDOMChanges();
            }
        }
        if (changes.youtubeSettings) {
            youtubeSettings = changes.youtubeSettings.newValue;
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

// Start the ad blocking
initialize(); 