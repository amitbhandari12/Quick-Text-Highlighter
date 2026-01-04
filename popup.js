const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const timerInput = document.getElementById('timerInput');
const statusDiv = document.getElementById('status');
const siteList = document.getElementById('siteList');
const currentSiteDiv = document.getElementById('currentSiteDiv');
const currentSiteSpan = document.getElementById('currentSite');

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return hours + 'h ' + (minutes % 60) + 'm';
  } else if (minutes > 0) {
    return minutes + 'm ' + (seconds % 60) + 's';
  } else {
    return seconds + 's';
  }
}

function updateUI() {
  chrome.runtime.sendMessage({ action: 'getState' }, function(response) {
    if (!response || !response.state) return;
    
    const state = response.state;
    
   
    if (state.isTracking) {
      statusDiv.textContent = '✓ Tracking Active';
      statusDiv.className = 'status tracking';
      
      if (state.currentSite) {
        currentSiteDiv.style.display = 'block';
        currentSiteSpan.textContent = state.currentSite;
      } else {
        currentSiteDiv.style.display = 'none';
      }
    } else {
      statusDiv.textContent = '⏸ Tracking Stopped';
      statusDiv.className = 'status stopped';
      currentSiteDiv.style.display = 'none';
    }
    
 
    if (state.timeLimit > 0) {
      timerInput.value = state.timeLimit;
    }
    
    
    const sites = state.siteData || {};
    const siteArray = [];
    
    for (let site in sites) {
      if (sites[site].time > 1000) {
        siteArray.push({
          name: site,
          time: sites[site].time
        });
      }
    }
    
    siteArray.sort((a, b) => b.time - a.time);
    
    if (siteArray.length === 0) {
      siteList.innerHTML = '<div class="empty-state"><div class="empty-icon">📱</div><div>No data yet!<br>Click Start to begin tracking</div></div>';
    } else {
      let html = '';
      siteArray.forEach((site, index) => {
        html += '<div class="site-item" style="animation-delay: ' + (index * 0.06) + 's">';
        html += '<div class="site-name">' + site.name + '</div>';
        html += '<div class="site-time">' + formatTime(site.time) + '</div>';
        html += '</div>';
      });
      siteList.innerHTML = html;
    }
  });
}

startBtn.addEventListener('click', function() {
  const minutes = parseInt(timerInput.value) || 0;
  
  chrome.runtime.sendMessage({ 
    action: 'start',
    timeLimit: minutes
  }, function(response) {
    if (response && response.success) {
      updateUI();
    }
  });
});

stopBtn.addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'stop' }, function(response) {
    if (response && response.success) {
      updateUI();
    }
  });
});

clearBtn.addEventListener('click', function() {
  if (confirm('Clear all tracking data?')) {
    chrome.runtime.sendMessage({ action: 'clear' }, function(response) {
      if (response && response.success) {
        updateUI();
      }
    });
  }
});


updateUI();

setInterval(updateUI, 1500);
