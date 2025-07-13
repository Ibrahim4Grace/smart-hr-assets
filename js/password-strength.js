document.addEventListener('DOMContentLoaded', function () {
    // Get password input and strength elements
    const passwordInput = document.querySelector('.pass-input');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordInfo = document.getElementById('passwordInfo');

    // Get strength indicator spans
    const poor = document.getElementById('poor');
    const weak = document.getElementById('weak');
    const strong = document.getElementById('strong');
    const heavy = document.getElementById('heavy');

    // Add event listener to password input
    if (passwordInput) {
        passwordInput.addEventListener('input', function () {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updateStrengthIndicator(strength);
        });
    }

    // Calculate password strength
    function calculatePasswordStrength(password) {
        let strength = 0;

        // Check length
        if (password.length >= 8) strength += 1;

        // Check for numbers
        if (/\d/.test(password)) strength += 1;

        // Check for lowercase letters
        if (/[a-z]/.test(password)) strength += 1;

        // Check for uppercase letters
        if (/[A-Z]/.test(password)) strength += 1;

        // Check for special characters
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        return strength;
    }

    // Update strength indicator based on calculated strength
    function updateStrengthIndicator(strength) {
        // Reset all indicators
        poor.style.width = '0%';
        weak.style.width = '0%';
        strong.style.width = '0%';
        heavy.style.width = '0%';

        // Set color and width based on strength
        if (strength <= 1) {
            poor.style.width = '25%';
            poor.style.backgroundColor = '#ff4d4d';
            passwordInfo.textContent = 'Poor Password';
            passwordInfo.style.color = '#ff4d4d';
        } else if (strength <= 2) {
            poor.style.width = '25%';
            weak.style.width = '25%';
            poor.style.backgroundColor = '#ff4d4d';
            weak.style.backgroundColor = '#ffa64d';
            passwordInfo.textContent = 'Weak Password';
            passwordInfo.style.color = '#ffa64d';
        } else if (strength <= 3) {
            poor.style.width = '25%';
            weak.style.width = '25%';
            strong.style.width = '25%';
            poor.style.backgroundColor = '#ff4d4d';
            weak.style.backgroundColor = '#ffa64d';
            strong.style.backgroundColor = '#ffff4d';
            passwordInfo.textContent = 'Medium Password';
            passwordInfo.style.color = '#ffff4d';
        } else if (strength <= 4) {
            poor.style.width = '25%';
            weak.style.width = '25%';
            strong.style.width = '25%';
            heavy.style.width = '25%';
            poor.style.backgroundColor = '#ff4d4d';
            weak.style.backgroundColor = '#ffa64d';
            strong.style.backgroundColor = '#ffff4d';
            heavy.style.backgroundColor = '#4dff4d';
            passwordInfo.textContent = 'Strong Password';
            passwordInfo.style.color = '#4dff4d';
        } else {
            poor.style.width = '25%';
            weak.style.width = '25%';
            strong.style.width = '25%';
            heavy.style.width = '25%';
            poor.style.backgroundColor = '#ff4d4d';
            weak.style.backgroundColor = '#ffa64d';
            strong.style.backgroundColor = '#ffff4d';
            heavy.style.backgroundColor = '#4dff4d';
            passwordInfo.textContent = 'Very Strong Password';
            passwordInfo.style.color = '#4dff4d';
        }
    }

}); 