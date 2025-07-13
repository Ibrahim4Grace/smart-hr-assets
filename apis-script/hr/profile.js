import { hrService } from '../../../services/hr-service.js';
import { handleManualFormSubmission, validationRules } from '../../../utils/utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('profileForm');
    const button = form.querySelector('button[type="submit"]');
    const statusMessage = document.getElementById('statusMessage') || document.createElement('div');

    // Add status message element if not present
    if (!statusMessage.parentNode) {
        form.prepend(statusMessage);
        statusMessage.id = 'statusMessage';
    }

    function validateProfile(data) {
        validationRules.required(data.name, 'Name');
        validationRules.required(data.email, 'Email');
        validationRules.email(data.email);

        if (data.new_password) {

            validationRules.required(data.current_password, 'Current Password');

            validationRules.minLength(data.new_password, 'New Password', 8);
            validationRules.passwordMatch(data.new_password, data.confirm_password);

            if (data.new_password === data.current_password) {
                throw new Error('New password cannot be the same as current password');
            }
        }
    }

    handleManualFormSubmission({
        form,
        button,
        statusMessage,
        onValidate: validateProfile,
        onSubmit: async (formData) => {
            if (!formData.new_password) {
                delete formData.current_password;
                delete formData.new_password;
                delete formData.confirm_password;
            }
            return await hrService.updateProfile(formData);
        },
        loadingText: 'Saving...',
        defaultText: 'Save',
        successMessage: 'Profile updated successfully!',
        resetForm: false,
        onSuccess: (response) => {

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    });
});