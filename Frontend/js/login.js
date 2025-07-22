document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const userEmail = document.getElementById('email').value.trim();
        const userPassword = document.getElementById('password').value;

        try {
            const response = await apiLoginUser({ email: userEmail, password: userPassword });

            if (response.success) {
                setSessionData('loggedInUser', response.user);
                sessionStorage.setItem('jwtToken', response.token);
                alert(`Welcome back, ${response.user.name}!`);
                navigateToDashboard(response.user.role);
            } else {
                alert(response.message);
            }
        } catch (error) {
            alert('An unexpected issue occurred during login: ' + error.message);
        }
    });
});