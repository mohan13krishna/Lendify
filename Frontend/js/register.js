document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registerForm');
    const roleSelector = document.getElementById('role');
    const bankerIdSection = document.getElementById('bankerIdGroup');
    const bankerIdInput = document.getElementById('bankerId');

    roleSelector.addEventListener('change', () => {
        if (roleSelector.value === 'banker') {
            bankerIdSection.classList.remove('d-none');
            bankerIdInput.setAttribute('required', 'true');
        } else {
            bankerIdSection.classList.add('d-none');
            bankerIdInput.removeAttribute('required');
        }
    });

    registrationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fullName = document.getElementById('name').value.trim();
        const userAge = parseInt(document.getElementById('age').value);
        const userEmail = document.getElementById('email').value.trim();
        const userPassword = document.getElementById('password').value;
        const userPhone = document.getElementById('phone').value.trim();
        const userRole = roleSelector.value;
        const submittedBankerId = bankerIdInput.value.trim();

        if (!fullName || !userAge || !userEmail || !userPassword || !userPhone || !userRole) {
            alert('Please fill out all mandatory fields.');
            return;
        }
        if (userAge < 18) {
            alert('You must be at least 18 years old to register.');
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(userEmail)) {
            alert('Please provide a valid email address.');
            return;
        }
        if (userPhone.length !== 10 || !/^\d{10}$/.test(userPhone)) {
            alert('Please enter a 10-digit phone number.');
            return;
        }
        if (userRole === 'banker' && !submittedBankerId) {
            alert('Banker ID is required for banker registration.');
            return;
        }

        const newUserData = {
            name: fullName,
            age: userAge,
            email: userEmail,
            password: userPassword,
            phone: userPhone,
            role: userRole,
            bankerId: userRole === 'banker' ? submittedBankerId : null,
        };

        try {
            const response = await apiRegisterNewUser(newUserData);

            if (response.success) {
                setSessionData('loggedInUser', response.user);
                sessionStorage.setItem('jwtToken', response.token);
                if (response.user.role === 'customer') {
                    alert('Registration complete! Your new account number is: ' + response.user.accountNumber);
                    navigateToDashboard('customer');
                } else if (response.user.role === 'banker') {
                    alert('Registration complete! Your banker account awaits administrator approval.');
                    window.location.href = 'login.html';
                }
            } else {
                alert(response.message);
            }
        } catch (error) {
            alert('An unexpected issue occurred during registration: ' + error.message);
        }

        registrationForm.reset();
    });
});