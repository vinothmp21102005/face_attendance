// Attendance tracking functionality

let isTracking = false;
let attendanceInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const videoFeed = document.getElementById('video-feed');
    const cameraPlaceholder = document.getElementById('camera-placeholder');
    const statusDiv = document.getElementById('attendance-status');
    const attendanceList = document.getElementById('attendance-list');
    
    // Status indicators
    const systemState = document.getElementById('system-state');
    const cameraState = document.getElementById('camera-state');
    const recognitionState = document.getElementById('recognition-state');

    // Load initial attendance records
    loadAttendanceRecords();

    // Start attendance tracking
    startBtn.addEventListener('click', async function() {
        try {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Starting...';

            const response = await makeRequest('/api/start_attendance', {
                method: 'POST'
            });

            if (response.success) {
                isTracking = true;
                
                // Update UI
                statusDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-video me-2"></i>
                        Attendance system is running. Face recognition is active.
                    </div>
                `;
                
                // Show video feed
                videoFeed.src = '/api/video_feed';
                videoFeed.style.display = 'block';
                cameraPlaceholder.style.display = 'none';
                
                // Update status indicators
                updateStatusIndicators('running', 'active', 'enabled');
                
                // Enable stop button
                stopBtn.disabled = false;
                
                // Start periodic refresh of attendance records
                attendanceInterval = setInterval(loadAttendanceRecords, 5000);
                
                showAlert('Attendance system started successfully!', 'success');
            }
        } catch (error) {
            showAlert(`Error starting attendance system: ${error.message}`, 'danger');
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error: ${error.message}
                </div>
            `;
        } finally {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Attendance';
        }
    });

    // Stop attendance tracking
    stopBtn.addEventListener('click', async function() {
        try {
            stopBtn.disabled = true;
            stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Stopping...';

            const response = await makeRequest('/api/stop_attendance', {
                method: 'POST'
            });

            if (response.success) {
                isTracking = false;
                
                // Update UI
                statusDiv.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Attendance system stopped. Click "Start Attendance" to resume.
                    </div>
                `;
                
                // Hide video feed
                videoFeed.style.display = 'none';
                videoFeed.src = '';
                cameraPlaceholder.style.display = 'flex';
                
                // Update status indicators
                updateStatusIndicators('stopped', 'inactive', 'disabled');
                
                // Clear attendance refresh interval
                if (attendanceInterval) {
                    clearInterval(attendanceInterval);
                    attendanceInterval = null;
                }
                
                showAlert('Attendance system stopped.', 'info');
            }
        } catch (error) {
            showAlert(`Error stopping attendance system: ${error.message}`, 'danger');
        } finally {
            stopBtn.disabled = true;
            stopBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Attendance';
        }
    });

    // Refresh attendance records
    refreshBtn.addEventListener('click', function() {
        loadAttendanceRecords();
    });

    // Handle video feed errors
    videoFeed.addEventListener('error', function() {
        if (isTracking) {
            showAlert('Camera feed error. Please try restarting the attendance system.', 'warning');
        }
    });

    function updateStatusIndicators(system, camera, recognition) {
        const states = {
            system: { running: 'Running', stopped: 'Stopped' },
            camera: { active: 'Active', inactive: 'Inactive' },
            recognition: { enabled: 'Enabled', disabled: 'Disabled' }
        };
        
        const colors = {
            running: 'bg-success', active: 'bg-success', enabled: 'bg-success',
            stopped: 'bg-secondary', inactive: 'bg-secondary', disabled: 'bg-secondary'
        };

        // Update system state
        systemState.textContent = states.system[system] || system;
        const systemIndicator = systemState.parentElement.querySelector('.status-indicator');
        systemIndicator.className = `status-indicator ${colors[system]} rounded-circle me-2`;

        // Update camera state
        cameraState.textContent = states.camera[camera] || camera;
        const cameraIndicator = cameraState.parentElement.querySelector('.status-indicator');
        cameraIndicator.className = `status-indicator ${colors[camera]} rounded-circle me-2`;

        // Update recognition state
        recognitionState.textContent = states.recognition[recognition] || recognition;
        const recognitionIndicator = recognitionState.parentElement.querySelector('.status-indicator');
        recognitionIndicator.className = `status-indicator ${colors[recognition]} rounded-circle me-2`;
    }

    async function loadAttendanceRecords() {
        try {
            const response = await makeRequest('/api/attendance_records');
            
            if (response.records && response.records.length > 0) {
                attendanceList.innerHTML = `
                    <div class="mb-3">
                        <h6 class="text-muted mb-2">
                            <i class="fas fa-calendar-day me-2"></i>
                            ${response.date}
                        </h6>
                    </div>
                `;
                
                response.records.forEach(record => {
                    const recordDiv = document.createElement('div');
                    recordDiv.className = 'attendance-record p-2 mb-2 rounded';
                    recordDiv.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${record.name}</strong>
                            </div>
                            <div class="text-muted small">
                                <i class="fas fa-clock me-1"></i>
                                ${record.time}
                            </div>
                        </div>
                    `;
                    attendanceList.appendChild(recordDiv);
                });
            } else {
                attendanceList.innerHTML = `
                    <div class="text-center text-muted">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <p>No attendance records for today</p>
                        <small class="text-muted">${response.date || 'Today'}</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading attendance records:', error);
            attendanceList.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading attendance records
                </div>
            `;
        }
    }
});