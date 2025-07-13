import { hrService } from '../../../services/hr-service.js';

class AvatarUpload {
    constructor() {
        this.initializeUpload();
    }

    initializeUpload() {
        try {
            // Create hidden file input
            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.accept = 'image/*';
            this.fileInput.style.display = 'none';
            document.body.appendChild(this.fileInput);

            // Add click event to all avatar images
            this.addClickListeners();

            this.fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });

        } catch (error) {
            console.error('AvatarUpload: Initialization error:', error);
        }
    }

    addClickListeners() {
        const avatarImages = document.querySelectorAll('.profile-avatar');

        avatarImages.forEach((img, index) => {
            img.style.cursor = 'pointer';
            img.title = 'Click to upload new profile picture';

            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.fileInput.click();
            });
        });
    }

    async handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image size should be less than 5MB', 'error');
            return;
        }

        try {
            // Show loading state
            this.showLoadingState();

            // Upload image
            const response = await hrService.uploadProfileImage(file);

            // Handle different response structures
            const isSuccess = response.success || response.status === 'success' || response.status_code === 200;
            const imageUrl = response.data?.imageUrl || response.data?.url || response.avatar_url || response.imageUrl || response.url;

            if (isSuccess && imageUrl) {
                // Update all avatar images with new URL
                this.updateAvatarImages(imageUrl);
                this.showNotification('Profile picture updated successfully!', 'success');
            } else {
                this.showNotification(response.message || 'Failed to upload image', 'error');
            }
        } catch (error) {
            console.error('AvatarUpload: Upload error:', error);
            this.showNotification('Failed to upload image. Please try again.', 'error');
        } finally {
            this.hideLoadingState();
        }
    }

    updateAvatarImages(imageUrl) {
        // Update all avatar images with the profile-avatar class
        const avatarImages = document.querySelectorAll('.profile-avatar');

        avatarImages.forEach(img => {
            img.src = imageUrl;
            // Add success animation
            img.classList.add('upload-success');
            setTimeout(() => {
                img.classList.remove('upload-success');
            }, 600);
        });
    }

    showLoadingState() {
        // Add loading overlay to avatars
        const avatarImages = document.querySelectorAll('.profile-avatar');

        avatarImages.forEach(img => {
            const container = img.closest('.avatar, .sidebar-profile, .user-profile');
            if (container) {
                container.style.position = 'relative';

                const overlay = document.createElement('div');
                overlay.className = 'avatar-loading-overlay';
                overlay.innerHTML = '<i class="ti ti-loader ti-spin"></i>';
                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: inherit;
                    color: white;
                    font-size: 1.2em;
                `;

                container.appendChild(overlay);
            }
        });
    }

    hideLoadingState() {
        // Remove loading overlays
        const overlays = document.querySelectorAll('.avatar-loading-overlay');
        overlays.forEach(overlay => overlay.remove());
    }

    showNotification(message, type = 'info') {
        // Use existing notification system or create a simple one
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            // Simple alert fallback
            alert(message);
        }
    }
}

// Initialize avatar upload when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AvatarUpload();
});

export default AvatarUpload; 