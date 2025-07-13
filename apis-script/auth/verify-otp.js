import { verifyOtp, resendOtp } from '../../../services/auth/auth-service.js';
import { handleFormSubmission, showStatus } from '../../../utils/utils.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('verifyOtpForm');
    const button = document.getElementById('verifyOtpButton');
    const statusMessage = document.getElementById('statusMessage');
    const resendButton = document.getElementById('resendOtp');
    const timerDisplay = document.getElementById('timer');

    // Get all digit inputs
    const digitInputs = [
        document.getElementById('digit-1'),
        document.getElementById('digit-2'),
        document.getElementById('digit-3'),
        document.getElementById('digit-4'),
        document.getElementById('digit-5'),
        document.getElementById('digit-6')
    ];

    let resendTimer;

    // Set up automatic focus navigation between inputs
    function setupDigitInputs() {
        digitInputs.forEach((input, index) => {
            if (!input) return;

            // Handle input - move to next field
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = value;

                if (value && index < digitInputs.length - 1) {
                    digitInputs[index + 1]?.focus();
                }
            });

            // Handle backspace - move to previous field
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    digitInputs[index - 1]?.focus();
                }
            });

            // Handle paste - distribute digits across inputs
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').trim();
                const numbers = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

                // Clear all inputs first
                digitInputs.forEach(inp => inp && (inp.value = ''));

                // Fill inputs with pasted numbers
                for (let i = 0; i < numbers.length && i < digitInputs.length; i++) {
                    if (digitInputs[i]) {
                        digitInputs[i].value = numbers[i];
                    }
                }

                // Focus the next empty input or the last filled input
                const nextEmptyIndex = Math.min(numbers.length, digitInputs.length - 1);
                digitInputs[nextEmptyIndex]?.focus();
            });
        });
    }

    // Get OTP value from all inputs
    function getOtpValue() {
        return digitInputs.map(input => input?.value || '').join('');
    }

    // Clear all OTP inputs
    function clearOtpInputs() {
        digitInputs.forEach(input => input && (input.value = ''));
        digitInputs[0]?.focus();
    }

    // Timer functionality
    function startResendTimer(duration = 30) {
        if (resendButton) {
            resendButton.style.pointerEvents = 'none';
            resendButton.style.opacity = '0.5';
        }

        let timeLeft = duration;
        if (timerDisplay) {
            timerDisplay.textContent = ` (${timeLeft}s)`;
        }

        clearInterval(resendTimer);
        resendTimer = setInterval(() => {
            timeLeft--;
            if (timerDisplay) {
                timerDisplay.textContent = ` (${timeLeft}s)`;
            }

            if (timeLeft <= 0) {
                clearInterval(resendTimer);
                if (resendButton) {
                    resendButton.style.pointerEvents = 'auto';
                    resendButton.style.opacity = '1';
                }
                if (timerDisplay) {
                    timerDisplay.textContent = '';
                }
            }
        }, 1000);
    }

    // Handle resend OTP
    if (resendButton) {
        resendButton.addEventListener('click', async () => {
            try {
                const token = sessionStorage.getItem('registrationToken');
                if (!token) {
                    throw new Error('Registration token not found. Please register again.');
                }

                await resendOtp();
                showStatus(statusMessage, 'OTP has been resent to your email.', false);
                startResendTimer();
                clearOtpInputs(); // Clear inputs when resending
            } catch (err) {
                showStatus(statusMessage, err.message || 'Failed to resend OTP. Please try again.', true);
            }
        });
    }

    // Handle form submission
    if (form) {
        // Initialize
        setupDigitInputs();
        startResendTimer();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            await handleFormSubmission({
                form,
                button,
                statusMessage,
                onValidate: () => {
                    const token = sessionStorage.getItem('registrationToken');
                    if (!token) throw new Error('Registration token not found. Please register again.');


                    const otpValue = getOtpValue();
                    if (!otpValue || otpValue.length !== 6) {
                        throw new Error('Please enter the complete 6-digit OTP.');
                    }
                },
                onSubmit: async () => {
                    const otpValue = getOtpValue();
                    return await verifyOtp({ otp: otpValue });
                },
                loadingText: 'Verifying...',
                defaultText: 'Verify & Proceed',
                successMessage: 'OTP verified! Redirecting to login...',
                redirectUrl: '/auth/login',
                redirectDelay: 2000
            });
        });
    }

    // Set copyright year
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});