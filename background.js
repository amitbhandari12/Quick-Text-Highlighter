let state = {
  currentSite: '',
  startTime: 0,
  isTracking: false,
  timeLimit: 0,
  siteData: {},
  notifiedSites: {}
};

// Initialize state from storage
chrome.storage.local.get(['state'], function(result) {
  if (result.state) {
    state = result.state;
    if (state.isTracking) {
      startTracking();
    }
  }
});

function saveState() {
  chrome.storage.local.set({ state: state });
}

function getDomain(url) {
  if (!url) return '';
  try {
    let hostname = new URL(url).hostname;
    hostname = hostname.replace('www.', '');
    return hostname;
  } catch (e) {
    return '';
  }
}

function saveCurrentSite() {
  if (state.currentSite && state.startTime > 0 && state.isTracking) {
    let timeSpent = Date.now() - state.startTime;
    
    if (!state.siteData[state.currentSite]) {
      state.siteData[state.currentSite] = { time: 0, lastVisit: Date.now() };
    }
    
    state.siteData[state.currentSite].time = state.siteData[state.currentSite].time + timeSpent;
    state.siteData[state.currentSite].lastVisit = Date.now();
    
    saveState();
    
    // Check notification
    if (state.timeLimit > 0) {
      let totalMinutes = Math.floor(state.siteData[state.currentSite].time / 60000);
      if (totalMinutes >= state.timeLimit && !state.notifiedSites[state.currentSite]) {
        state.notifiedSites[state.currentSite] = true;
        saveState();
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Time Limit Reached!',
          message: 'You spent ' + totalMinutes + ' minutes on ' + state.currentSite,
          priority: 2
        });
      }
    }
  }
}

function getCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs[0] && tabs[0].url) {
      saveCurrentSite();
      state.currentSite = getDomain(tabs[0].url);
      state.startTime = Date.now();
      saveState();
    }
  });
}

function startTracking() {
  state.isTracking = true;
  state.notifiedSites = {};
  getCurrentTab();
  saveState();
}

function stopTracking() {
  saveCurrentSite();
  state.isTracking = false;
  state.currentSite = '';
  state.startTime = 0;
  saveState();
}

// Listen for tab changes
chrome.tabs.onActivated.addListener(function() {
  if (state.isTracking) {
    getCurrentTab();
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (state.isTracking && changeInfo.url) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id === tabId) {
        saveCurrentSite();
        state.currentSite = getDomain(changeInfo.url);
        state.startTime = Date.now();
        saveState();
      }
    });
  }
});

chrome.windows.onFocusChanged.addListener(function(windowId) {
  if (!state.isTracking) return;
  
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    saveCurrentSite();
    state.currentSite = '';
    state.startTime = 0;
  } else {
    getCurrentTab();
  }
});

// Save every 2 seconds
setInterval(function() {
  if (state.isTracking && state.currentSite) {
    saveCurrentSite();
    state.startTime = Date.now();
  }
}, 2000);

// Message handler
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'start') {
    state.timeLimit = request.timeLimit || 0;
    startTracking();
    sendResponse({ success: true, state: state });
  } 
  else if (request.action === 'stop') {
    stopTracking();
    sendResponse({ success: true, state: state });
  } 
  else if (request.action === 'getState') {
    sendResponse({ state: state });
  } 
  else if (request.action === 'clear') {
    state.siteData = {};
    state.notifiedSites = {};
    saveState();
    sendResponse({ success: true, state: state });
  }
  return true;
});