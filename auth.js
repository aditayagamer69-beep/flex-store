const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbFile = path.join(__dirname, "flexstore.json");

function loadDatabase() {
    if (!fs.existsSync(dbFile)) {
        const initialData = {
            users: []
        };

        fs.writeFileSync(
            dbFile,
            JSON.stringify(initialData, null, 2)
        );
    }

    const data = JSON.parse(
        fs.readFileSync(dbFile, "utf8")
    );

    // Existing users ko automatically normal user role dena
    if (!Array.isArray(data.users)) {
        data.users = [];
    }

    let changed = false;

    data.users.forEach(user => {
        if (!user.role) {
            user.role = "user";
            changed = true;
        }
    });

    if (changed) {
        saveDatabase(data);
    }

    return data;
}

function saveDatabase(data) {
    fs.writeFileSync(
        dbFile,
        JSON.stringify(data, null, 2)
    );
}

function createUser(username, email, password) {
    const data = loadDatabase();

    const hashedPassword = bcrypt.hashSync(password, 12);

    const user = {
        id: Date.now(),
        username,
        email,
        password: hashedPassword,
        role: "user",
        created_at: new Date().toISOString()
    };

    data.users.push(user);
    saveDatabase(data);

    return user;
}

function findUser(login) {
    const data = loadDatabase();

    const value = login.trim().toLowerCase();

    return data.users.find(user =>
        user.username.toLowerCase() === value ||
        user.email.toLowerCase() === value
    );
}

function findUserById(id) {
    const data = loadDatabase();

    return data.users.find(
        user => Number(user.id) === Number(id)
    );
}

function setUserRole(identifier, role) {
    const data = loadDatabase();

    const value = identifier.trim().toLowerCase();

    const user = data.users.find(user =>
        user.username.toLowerCase() === value ||
        user.email.toLowerCase() === value
    );

    if (!user) {
        return null;
    }

    user.role = role;

    saveDatabase(data);

    return user;
}

function checkPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
}

function userExists(username, email) {
    const data = loadDatabase();

    const usernameExists = data.users.some(
        user =>
            user.username.toLowerCase() ===
            username.toLowerCase()
    );

    const emailExists = data.users.some(
        user =>
            user.email.toLowerCase() ===
            email.toLowerCase()
    );

    return usernameExists || emailExists;
}

module.exports = {
    loadDatabase,
    saveDatabase,
    createUser,
    findUser,
    findUserById,
    setUserRole,
    checkPassword,
    userExists
};
