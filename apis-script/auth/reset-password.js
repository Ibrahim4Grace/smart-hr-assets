import { resetPassword } from '../../../services/auth/auth-service.js';
import { handleFormSubmission, validatePasswordComplexity } from '../../../utils/utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('resetPasswordForm');
    const button = document.getElementById('resetPasswordButton');
    const statusMessage = document.getElementById('statusMessage');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmission({
                form,
                button,
                statusMessage,
                onValidate: (data) => {
                    if (!data.new_password || data.new_password.length < 6) {
                        throw new Error('Password must be at least 6 characters long');
                    }
                    if (data.new_password !== data.confirm_password) {
                        throw new Error('Passwords do not match');
                    }
                    validatePasswordComplexity(data.new_password);
                },
                onSubmit: async (formData) => {
                    return await resetPassword(formData.new_password);
                },
                loadingText: 'Resetting...',
                defaultText: 'Submit',
                successMessage: 'Password reset successful! Redirecting to login...',
                redirectUrl: '/auth/login',
                redirectDelay: 2000
            });
        });
    }
});