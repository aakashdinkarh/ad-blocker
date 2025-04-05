document.addEventListener('DOMContentLoaded', async () => {
    const toggleProtection = document.getElementById('toggleProtection');
    const adShowingClass = document.getElementById('adShowingClass');
    const saveSettings = document.getElementById('saveSettings');

    // Initialize toggle state and YouTube settings from storage
    try {
        const { isEnabled = true, youtubeSettings = { adShowingClass: 'ad-showing' } } = 
            await chrome.storage.sync.get(['isEnabled', 'youtubeSettings']);
        
        toggleProtection.checked = isEnabled;
        adShowingClass.value = youtubeSettings.adShowingClass;
    } catch (error) {
        console.error('Error loading settings:', error);
    }

    // Handle toggle switch changes
    toggleProtection.addEventListener('change', async () => {
        try {
            await chrome.storage.sync.set({ isEnabled: toggleProtection.checked });
            
            // Send message to background script to update blocking state
            await chrome.runtime.sendMessage({
                type: 'TOGGLE_PROTECTION',
                isEnabled: toggleProtection.checked
            });
        } catch (error) {
            console.error('Error saving toggle state:', error);
            // Revert toggle if save fails
            toggleProtection.checked = !toggleProtection.checked;
        }
    });

    // Handle YouTube settings save
    saveSettings.addEventListener('click', async () => {
        try {
            const youtubeSettings = {
                adShowingClass: adShowingClass.value.trim() || 'ad-showing'
            };
            
            await chrome.storage.sync.set({ youtubeSettings });
            
            // Notify content scripts of the update
            chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'YOUTUBE_SETTINGS_UPDATED',
                        settings: youtubeSettings
                    });
                });
            });

            // Visual feedback and auto-close
            saveSettings.textContent = 'Saved!';
            setTimeout(() => {
                saveSettings.textContent = 'Save Settings';
                // Wait a second after text changes back before closing
                setTimeout(() => {
                    window.close();
                }, 1000);
            }, 2000);
        } catch (error) {
            console.error('Error saving YouTube settings:', error);
            saveSettings.textContent = 'Error Saving';
            setTimeout(() => {
                saveSettings.textContent = 'Save Settings';
                // Also auto-close after error
                setTimeout(() => {
                    window.close();
                }, 1000);
            }, 2000);
        }
    });
}); 