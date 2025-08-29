// Attendance system JavaScript with correct element IDs and null safety

// Utility functions for safe DOM manipulation
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

function safeUpdateElement(id, property, value) {
    const element = safeGetElement(id);
    if (element) {
        element[property] = value;
        return true;
    }
    return false;
}

function safeToggleClass(id, className, add = true) {
    const element = safeGetElement(id);
    if (element) {
        if (add) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
        return true;
    }
    return false;
}

function safeSetAttribute(id, attribute, value) {
    const element = safeGetElement(id);
    if (element) {
        element.setAttribute(attribute, value);
        return true;
    }
    return false;
}

function safeRemoveAttribute(id, attribute) {
    const element = safeGetElement(id);
    if (element) {
        element.removeAttribute(attribute);
        return true;
    }
    return false;
}

// Global variables
let attendancePollingInterval = null;
let isSystemRunning = false;

// Main attendance functions
async function startAttendance() {
    const startBtn = safeGetElement('start-btn');
    const stopBtn = safeGetElement('stop-btn');
    
    try {
        // Update UI immediately
        updateSystemStatus('Starting attendance system...', 'warning');
        
        if (startBtn) startBtn.disabled = true;

        const response = await fetch('/api/start_attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            updateSystemStatus('Attendance system started successfully', 'success');
            
            // Update button states
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            
            // Update status indicators
            updateStatusIndicators(true, true, true);
            
            // Start video feed
            startVideoFeed();
            
            // Start polling for attendance records
            startAttendancePolling();
            
            isSystemRunning = true;
            
        } else {
            updateSystemStatus(`Error: ${data.error}`, 'danger');
            
            // Reset button states on error
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            
            updateStatusIndicators(false, false, false);
        }
    } catch (error) {
        console.error('Error starting attendance:', error);
        updateSystemStatus('Failed to start attendance system', 'danger');
        
        // Reset button states on error
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        
        updateStatusIndicators(false, false, false);
    }
}

async function stopAttendance() {
    const startBtn = safeGetElement('start-btn');
    const stopBtn = safeGetElement('stop-btn');
    
    try {
        updateSystemStatus('Stopping attendance system...', 'warning');
        
        if (stopBtn) stopBtn.disabled = true;

        const response = await fetch('/api/stop_attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            updateSystemStatus('Attendance system stopped', 'info');
            
            // Update button states
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            
            // Update status indicators
            updateStatusIndicators(false, false, false);
            
            // Stop video feed
            stopVideoFeed();
            
            // Stop polling
            stopAttendancePolling();
            
            isSystemRunning = false;
            
        } else {
            updateSystemStatus(`Error: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error stopping attendance:', error);
        updateSystemStatus('Failed to stop attendance system', 'danger');
        
        // Reset button states
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }
}

// Video feed functions
function startVideoFeed() {
    const videoFeed = safeGetElement('video-feed');
    const placeholder = safeGetElement('camera-placeholder');
    
    if (videoFeed) {
        videoFeed.src = `/api/video_feed?${new Date().getTime()}`;
        videoFeed.style.display = 'block';
        videoFeed.onload = function() {
            if (placeholder) placeholder.style.display = 'none';
        };
    }
}

function stopVideoFeed() {
    const videoFeed = safeGetElement('video-feed');
    const placeholder = safeGetElement('camera-placeholder');
    
    if (videoFeed) {
        videoFeed.src = '';
        videoFeed.style.display = 'none';
    }
    
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
}

// Status update functions
function updateSystemStatus(message, type = 'info') {
    const statusDiv = safeGetElement('attendance-status');
    if (!statusDiv) return;
    
    const alertClass = `alert alert-${type}`;
    const icon = getStatusIcon(type);
    
    statusDiv.innerHTML = `
        <div class="${alertClass}">
            <i class="${icon} me-2"></i>${message}
        </div>
    `;
}

function getStatusIcon(type) {
    const icons = {
        'success': 'fas fa-check-circle',
        'danger': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-spinner fa-spin',
        'info': 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-info-circle';
}

function updateStatusIndicators(systemActive, cameraActive, recognitionActive) {
    // System status
    const systemState = safeGetElement('system-state');
    const systemIndicator = document.querySelector('#system-status .status-indicator:nth-child(1)');
    
    if (systemState) {
        systemState.textContent = systemActive ? 'Running' : 'Stopped';
    }
    if (systemIndicator) {
        systemIndicator.className = `status-indicator rounded-circle me-2 ${systemActive ? 'bg-success' : 'bg-secondary'}`;
    }
    
    // Camera status
    const cameraState = safeGetElement('camera-state');
    const cameraIndicator = document.querySelector('#system-status .status-indicator:nth-child(2)');
    
    if (cameraState) {
        cameraState.textContent = cameraActive ? 'Active' : 'Inactive';
    }
    if (cameraIndicator) {
        cameraIndicator.className = `status-indicator rounded-circle me-2 ${cameraActive ? 'bg-success' : 'bg-secondary'}`;
    }
    
    // Recognition status
    const recognitionState = safeGetElement('recognition-state');
    const recognitionIndicator = document.querySelector('#system-status .status-indicator:nth-child(3)');
    
    if (recognitionState) {
        recognitionState.textContent = recognitionActive ? 'Enabled' : 'Disabled';
    }
    if (recognitionIndicator) {
        recognitionIndicator.className = `status-indicator rounded-circle me-2 ${recognitionActive ? 'bg-success' : 'bg-secondary'}`;
    }
}

// Attendance polling functions
function startAttendancePolling() {
    loadAttendanceRecords(); // Load immediately
    attendancePollingInterval = setInterval(loadAttendanceRecords, 3000); // Poll every 3 seconds
}

function stopAttendancePolling() {
    if (attendancePollingInterval) {
        clearInterval(attendancePollingInterval);
        attendancePollingInterval = null;
    }
}

async function loadAttendanceRecords() {
    try {
        const response = await fetch('/api/attendance_records');
        const data = await response.json();
        
        displayAttendanceRecords(data);
    } catch (error) {
        console.error('Error loading attendance records:', error);
        const attendanceList = safeGetElement('attendance-list');
        if (attendanceList) {
            attendanceList.innerHTML = `
                <div class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle mb-2"></i>
                    <p>Failed to load attendance records</p>
                </div>
            `;
        }
    }
}

function displayAttendanceRecords(data) {
    const attendanceList = safeGetElement('attendance-list');
    if (!attendanceList) return;
    
    if (!data.records || data.records.length === 0) {
        attendanceList.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-users fa-2x mb-2"></i>
                <p>No attendance records yet</p>
                <small class="text-muted">Date: ${data.date || 'Today'}</small>
            </div>
        `;
        return;
    }
    
    let html = `<div class="mb-2"><small class="text-muted">Date: ${data.date}</small></div>`;
    
    data.records.forEach((record, index) => {
        html += `
            <div class="d-flex justify-content-between align-items-center py-2 ${index > 0 ? 'border-top' : ''}">
                <div class="d-flex align-items-center">
                    <i class="fas fa-user-check text-success me-2"></i>
                    <span class="fw-medium">${record.name}</span>
                </div>
                <small class="text-muted">${record.time}</small>
            </div>
        `;
    });
    
    attendanceList.innerHTML = html;
}

// Manual refresh function
async function refreshAttendanceRecords() {
    const refreshBtn = safeGetElement('refresh-btn');
    
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
    }
    
    try {
        await loadAttendanceRecords();
    } finally {
        if (refreshBtn) {
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh Records';
            }, 1000);
        }
    }
}

// Check camera status periodically
async function checkCameraStatus() {
    try {
        const response = await fetch('/api/camera_status');
        const data = await response.json();
        
        if (data.is_running !== isSystemRunning) {
            // Sync UI with actual system state
            const startBtn = safeGetElement('start-btn');
            const stopBtn = safeGetElement('stop-btn');
            
            if (data.is_running) {
                if (startBtn) startBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = false;
                updateStatusIndicators(true, true, true);
                if (!isSystemRunning) {
                    startVideoFeed();
                    startAttendancePolling();
                }
            } else {
                if (startBtn) startBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = true;
                updateStatusIndicators(false, false, false);
                if (isSystemRunning) {
                    stopVideoFeed();
                    stopAttendancePolling();
                }
            }
            
            isSystemRunning = data.is_running;
        }
    } catch (error) {
        console.error('Error checking camera status:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners
    const startBtn = safeGetElement('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startAttendance);
    }
    
    const stopBtn = safeGetElement('stop-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopAttendance);
    }
    
    const refreshBtn = safeGetElement('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAttendanceRecords);
    }
    
    // Load initial attendance records
    loadAttendanceRecords();
    
    // Check camera status periodically
    setInterval(checkCameraStatus, 5000);
    checkCameraStatus(); // Check immediately
    
    // Initialize status indicators
    updateStatusIndicators(false, false, false);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (isSystemRunning) {
        // Send stop request without waiting for response
        fetch('/api/stop_attendance', { method: 'POST' }).catch(() => {});
    }
    
    stopVideoFeed();
    stopAttendancePolling();
});

// Handle video feed errors
document.addEventListener('DOMContentLoaded', function() {
    const videoFeed = safeGetElement('video-feed');
    if (videoFeed) {
        videoFeed.onerror = function() {
            console.warn('Video feed error - attempting to reconnect...');
            if (isSystemRunning) {
                setTimeout(() => {
                    startVideoFeed();
                }, 2000);
            }
        };
    }
});

// Add CSS for status indicators (if not already in CSS file)
const style = document.createElement('style');
style.textContent = `
    .status-indicator {
        width: 8px;
        height: 8px;
        display: inline-block;
    }
    .bg-success {
        background-color: #28a745 !important;
    }
    .bg-secondary {
        background-color: #6c757d !important;
    }
`;
document.head.appendChild(style);