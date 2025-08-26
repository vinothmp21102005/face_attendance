// Face collection functionality

let isCollecting = false;
let currentStudent = '';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('collection-form');
    const captureBtn = document.getElementById('capture-btn');
    const stopBtn = document.getElementById('stop-btn');
    const videoFeed = document.getElementById('video-feed');
    const cameraPlaceholder = document.getElementById('camera-placeholder');
    const statusDiv = document.getElementById('collection-status');
    const captureCountDiv = document.getElementById('capture-count');
    const countDisplay = document.getElementById('count-display');

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const studentName = document.getElementById('student-name').value.trim();
        if (!studentName) {
            showAlert('Please enter a student name', 'warning');
            return;
        }

        try {
            toggleButton('collection-form', false);
            showLoading('collection-status', 'Starting collection...');

            const response = await makeRequest('/api/start_collection', {
                method: 'POST',
                body: JSON.stringify({ student_name: studentName })
            });

            if (response.success) {
                isCollecting = true;
                currentStudent = studentName;
                
                // Update UI
                statusDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-camera me-2"></i>
                        Collection started for <strong>${studentName}</strong>
                    </div>
                `;
                
                // Show video feed
                videoFeed.src = '/api/video_feed';
                videoFeed.style.display = 'block';
                cameraPlaceholder.style.display = 'none';
                
                // Enable buttons
                captureBtn.disabled = false;
                stopBtn.disabled = false;
                
                // Show capture count
                captureCountDiv.style.display = 'block';
                countDisplay.textContent = '0';
                
                showAlert(`Collection started for ${studentName}`, 'success');
            }
        } catch (error) {
            showAlert(`Error starting collection: ${error.message}`, 'danger');
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error: ${error.message}
                </div>
            `;
        } finally {
            toggleButton('collection-form', true);
        }
    });

    // Capture image
    captureBtn.addEventListener('click', async function() {
        if (!isCollecting) return;

        try {
            captureBtn.disabled = true;
            captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Capturing...';

            const response = await makeRequest('/api/capture_image', {
                method: 'POST'
            });

            if (response.success) {
                countDisplay.textContent = response.count;
                showAlert(response.message, 'success');
            }
        } catch (error) {
            showAlert(`Error capturing image: ${error.message}`, 'danger');
        } finally {
            captureBtn.disabled = false;
            captureBtn.innerHTML = '<i class="fas fa-camera me-2"></i>Capture Image';
        }
    });

    // Stop collection
    stopBtn.addEventListener('click', async function() {
        if (!isCollecting) return;

        try {
            stopBtn.disabled = true;
            stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Stopping...';

            const response = await makeRequest('/api/stop_collection', {
                method: 'POST'
            });

            if (response.success) {
                isCollecting = false;
                currentStudent = '';
                
                // Update UI
                statusDiv.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-check-circle me-2"></i>
                        ${response.message}
                    </div>
                `;
                
                // Hide video feed
                videoFeed.style.display = 'none';
                videoFeed.src = '';
                cameraPlaceholder.style.display = 'flex';
                
                // Reset buttons
                captureBtn.disabled = true;
                stopBtn.disabled = true;
                
                // Reset form
                document.getElementById('student-name').value = '';
                captureCountDiv.style.display = 'none';
                
                showAlert(response.message, 'success');
            }
        } catch (error) {
            showAlert(`Error stopping collection: ${error.message}`, 'danger');
        } finally {
            stopBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Collection';
        }
    });

    // Handle video feed errors
    videoFeed.addEventListener('error', function() {
        if (isCollecting) {
            showAlert('Camera feed error. Please try refreshing the page.', 'warning');
        }
    });
});