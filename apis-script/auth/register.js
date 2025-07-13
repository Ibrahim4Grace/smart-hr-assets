import { register } from '../../../services/auth/auth-service.js';
import { handleFormSubmission, validationRules } from '../../../utils/utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registerForm');
    const button = document.getElementById('registerButton');
    const statusMessage = document.getElementById('statusMessage');

    // Registration-specific validation
    function validateRegistration(data) {
        validationRules.minLength(data.name, 'Name', 2);
        validationRules.email(data.email);
        validationRules.minLength(data.password, 'Password', 6);
        validationRules.passwordMatch(data.password, data.confirm_password);

        // Check terms agreement
        const termsCheckbox = document.getElementById('remember_me');
        if (!termsCheckbox.checked) {
            throw new Error('Please agree to the Terms & Privacy');
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            await handleFormSubmission({
                form,
                button,
                statusMessage,
                onValidate: validateRegistration,
                onSubmit: async (formData) => {
                    // Only send required fields to backend
                    const payload = {
                        name: formData.name,
                        email: formData.email,
                        password: formData.password
                    };
                    const response = await register(payload);
                    sessionStorage.setItem('registrationToken', response.data.token);
                    return response;
                },
                loadingText: 'Signing Up...',
                defaultText: 'Sign Up',
                successMessage: 'Registration successful! Redirecting to otp...',
                redirectUrl: '/auth/verify-otp',
                redirectDelay: 2000
            });
        });
    }
}); 