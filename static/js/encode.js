// Face encoding functionality

document.addEventListener('DOMContentLoaded', function() {
    const encodeBtn = document.getElementById('encode-btn');
    const statusDiv = document.getElementById('encoding-status');
    const progressDiv = document.getElementById('encoding-progress');
    const resultsDiv = document.getElementById('encoding-results');
    const resultsList = document.getElementById('results-list');

    encodeBtn.addEventListener('click', async function() {
        try {
            // Update UI to show progress
            encodeBtn.disabled = true;
            encodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Encoding...';
            
            statusDiv.style.display = 'none';
            progressDiv.style.display = 'block';
            resultsDiv.style.display = 'none';

            const response = await makeRequest('/api/encode_faces', {
                method: 'POST'
            });

            if (response.success) {
                // Hide progress and show results
                progressDiv.style.display = 'none';
                resultsDiv.style.display = 'block';
                
                // Clear previous results
                resultsList.innerHTML = '';
                
                // Show success message
                const successAlert = document.createElement('div');
                successAlert.className = 'alert alert-success mb-3';
                successAlert.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Encoding Complete!</strong> ${response.message}
                `;
                resultsDiv.insertBefore(successAlert, resultsList);
                
                // Display processed files
                if (response.processed_files && response.processed_files.length > 0) {
                    response.processed_files.forEach(file => {
                        const listItem = document.createElement('div');
                        listItem.className = 'list-group-item';
                        
                        if (file.includes('(no face found)') || file.includes('(error:')) {
                            listItem.className += ' list-group-item-warning';
                            listItem.innerHTML = `
                                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                ${file}
                            `;
                        } else {
                            listItem.className += ' list-group-item-success';
                            listItem.innerHTML = `
                                <i class="fas fa-check text-success me-2"></i>
                                ${file}
                            `;
                        }
                        
                        resultsList.appendChild(listItem);
                    });
                } else {
                    resultsList.innerHTML = `
                        <div class="list-group-item">
                            <i class="fas fa-info-circle text-info me-2"></i>
                            No files were processed.
                        </div>
                    `;
                }
                
                showAlert('Face encoding completed successfully!', 'success');
            }
        } catch (error) {
            // Hide progress and show error
            progressDiv.style.display = 'none';
            statusDiv.style.display = 'block';
            
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Encoding Failed:</strong> ${error.message}
                </div>
            `;
            
            showAlert(`Encoding failed: ${error.message}`, 'danger');
        } finally {
            // Reset button
            encodeBtn.disabled = false;
            encodeBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Encoding';
        }
    });
});