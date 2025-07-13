import { verifyPasswordOtp } from '../../../services/auth/auth-service.js';
import { handleFormSubmission } from '../../../utils/utils.js';

function setupOtpInputs() {
    const digitInputs = [
        document.getElementById('digit-1'),
        document.getElementById('digit-2'),
        document.getElementById('digit-3'),
        document.getElementById('digit-4'),
        document.getElementById('digit-5'),
        document.getElementById('digit-6')
    ];

    digitInputs.forEach((input, index) => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const value = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = value;
            if (value && index < digitInputs.length - 1) {
                digitInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                digitInputs[index - 1].focus();
            }
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            digitInputs.forEach((inp, i) => inp.value = pasted[i] || '');
            const next = Math.min(pasted.length, digitInputs.length - 1);
            digitInputs[next].focus();
        });
    });
}

function getOtpValue() {
    return Array.from({ length: 6 }, (_, i) => document.getElementById(`digit-${i + 1}`).value).join('');
}

document.addEventListener('DOMContentLoaded', function () {
    setupOtpInputs();

    const form = document.getElementById('verifyPasswordOtpForm');
    const button = document.getElementById('verifyPasswordOtpButton');
    const statusMessage = document.getElementById('statusMessage');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmission({
                form,
                button,
                statusMessage,
                onValidate: () => {
                    const otp = getOtpValue();
                    if (!otp || otp.length !== 6) {
                        throw new Error('Please enter the 6-digit OTP');
                    }
                },
                onSubmit: async () => {
                    return await verifyPasswordOtp(getOtpValue());
                },
                loadingText: 'Verifying...',
                defaultText: 'Verify',
                successMessage: 'OTP verified! Please set your new password.',
                redirectUrl: '/auth/reset-password',
                redirectDelay: 2000
            });
        });
    }
});