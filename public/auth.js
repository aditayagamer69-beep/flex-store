const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");
const showPassword = document.getElementById("showPassword");

function showMessage(text, success = false) {
    if (!message) return;

    message.textContent = text;
    message.style.color = success ? "#16a34a" : "#dc2626";
}

if (showPassword) {
    showPassword.addEventListener("click", () => {
        const password = document.getElementById("password");

        if (password.type === "password") {
            password.type = "text";
            showPassword.textContent = "Hide";
        } else {
            password.type = "password";
            showPassword.textContent = "Show";
        }
    });
}

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!data.success) {
                showMessage(data.message);
                return;
            }

            showMessage(
                "Account created! Redirecting to login...",
                true
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            showMessage("Unable to connect to Flex Store.");
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const login = document.getElementById("login").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login,
                    password
                })
            });

            const data = await response.json();

            if (!data.success) {
                showMessage(data.message);
                return;
            }

            showMessage(
                `Welcome back, ${data.username}!`,
                true
            );

            setTimeout(() => {
                window.location.href = "/";
            }, 1000);

        } catch (error) {
            showMessage("Unable to connect to Flex Store.");
        }
    });
}
