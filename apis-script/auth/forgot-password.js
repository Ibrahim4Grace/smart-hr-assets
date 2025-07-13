import { forgotPassword } from '../../../services/auth/auth-service.js';
import { handleFormSubmission } from '../../../utils/utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgotPasswordForm');
    const button = document.getElementById('forgotPasswordButton');
    const statusMessage = document.getElementById('statusMessage');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmission({
                form,
                button,
                statusMessage,
                onValidate: (data) => {
                    if (!data.email || !data.email.includes('@')) {
                        throw new Error('Please enter a valid email address');
                    }
                },
                onSubmit: async (formData) => {
                    return await forgotPassword(formData.email);
                },
                loadingText: 'Sending...',
                defaultText: 'Submit',
                successMessage: 'OTP sent! Please check your email.',
                redirectUrl: '/auth/otp',
                redirectDelay: 2000
            });
        });
    }
});