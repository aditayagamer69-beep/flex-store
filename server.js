const express = require("express");
const path = require("path");
const session = require("express-session");
const fs = require("fs");
const multer = require("multer");

const {
    createUser,
    findUser,
    findUserById,
    checkPassword,
    userExists
} = require("./auth");

const app = express();

const PORT = process.env.PORT || 3000;

const pluginsFile =
    path.join(__dirname, "plugins.json");

const pluginsDir =
    path.join(__dirname, "plugins");

const visitorsFile = path.join(__dirname, "visitors.json");

function loadVisitors() {
    return JSON.parse(fs.readFileSync(visitorsFile, "utf8"));
}

function saveVisitors(data) {
    fs.writeFileSync(visitorsFile, JSON.stringify(data, null, 2));
}


/* =========================
   PLUGIN STORAGE
========================= */

if (!fs.existsSync(pluginsDir)) {

    fs.mkdirSync(
        pluginsDir,
        {
            recursive: true
        }
    );

}


if (!fs.existsSync(pluginsFile)) {

    fs.writeFileSync(

        pluginsFile,

        JSON.stringify(
            {
                plugins: []
            },
            null,
            2
        )

    );

}


function loadPlugins() {

    return JSON.parse(

        fs.readFileSync(
            pluginsFile,
            "utf8"
        )

    );

}


function savePlugins(data) {

    fs.writeFileSync(

        pluginsFile,

        JSON.stringify(
            data,
            null,
            2
        )

    );

}


/* =========================
   SLUG
========================= */

function createSlug(name) {

    return name

        .toLowerCase()

        .trim()

        .replace(
            /[^a-z0-9]+/g,
            "-"
        )

        .replace(
            /^-+|-+$/g,
            ""
        );

}


/* =========================
   MULTER
========================= */

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                pluginsDir
            );

        },


        filename: (
            req,
            file,
            cb
        ) => {

            const ext =
                path
                    .extname(
                        file.originalname
                    )
                    .toLowerCase();


            if (
                file.fieldname ===
                "pluginJar"
            ) {

                cb(
                    null,
                    `${Date.now()}-plugin${ext}`
                );

                return;

            }


            cb(
                null,
                `${Date.now()}-logo${ext}`
            );

        }

    });


const upload =
    multer({

        storage,

        limits: {

            fileSize:
                100 * 1024 * 1024

        },


        fileFilter: (
            req,
            file,
            cb
        ) => {


            if (
                file.fieldname ===
                "pluginJar"
            ) {

                if (
                    path
                        .extname(
                            file.originalname
                        )
                        .toLowerCase()
                    !== ".jar"
                ) {

                    return cb(
                        new Error(
                            "Only JAR files are allowed."
                        )
                    );

                }

            }


            if (
                file.fieldname ===
                "pluginLogo"
            ) {

                const allowed = [

                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".webp"

                ];


                if (
                    !allowed.includes(

                        path
                            .extname(
                                file.originalname
                            )
                            .toLowerCase()

                    )
                ) {

                    return cb(
                        new Error(
                            "Invalid logo format."
                        )
                    );

                }

            }


            cb(
                null,
                true
            );

        }

    });


/* =========================
   MIDDLEWARE
========================= */

app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true
    })
);


app.use(

    session({

        secret:
            "CHANGE_THIS_SECRET_LATER",

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            sameSite:
                "lax"

        }

    })

);


/* =========================
   VISITOR COUNTER
========================= */

app.use((req, res, next) => {

    if (
        req.method === "GET" &&
        req.path === "/" &&
        !req.session.visitorCounted
    ) {

        const data = loadVisitors();

        data.count++;

        saveVisitors(data);

        req.session.visitorCounted = true;

    }

    next();

});


app.use(

    express.static(
        path.join(
            __dirname,
            "public"
        )
    )

);


/* =========================
   VISITOR COUNT API
========================= */

app.get("/api/visitor-count", (req, res) => {

    const data = loadVisitors();

    res.json({
        count: data.count
    });

});


/* =========================
   OWNER AUTH
========================= */

function requireOwner(
    req,
    res,
    next
) {


    if (!req.session.userId) {

        return res.status(401).json({

            success:
                false,

            message:
                "Login required."

        });

    }


    const user =
        findUserById(
            req.session.userId
        );


    if (
        !user ||
        user.role !== "owner"
    ) {

        return res.status(403).json({

            success:
                false,

            message:
                "Owner access required."

        });

    }


    next();

}


/* =========================
   REGISTER
========================= */

app.post(
    "/api/register",
    (req, res) => {


        const {
            username,
            email,
            password
        } = req.body;


        if (
            !username ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "All fields are required."

            });

        }


        const cleanUsername =
            username.trim();


        const cleanEmail =
            email
                .trim()
                .toLowerCase();


        if (
            cleanUsername.length < 3 ||
            cleanUsername.length > 20
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Username must be 3-20 characters."

            });

        }


        if (
            password.length < 8
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Password must be at least 8 characters."

            });

        }


        if (
            userExists(
                cleanUsername,
                cleanEmail
            )
        ) {

            return res.status(409).json({

                success:
                    false,

                message:
                    "Username or email already exists."

            });

        }


        try {


            createUser(

                cleanUsername,

                cleanEmail,

                password

            );


            res.json({

                success:
                    true,

                message:
                    "Account created successfully."

            });


        } catch (error) {


            console.error(error);


            res.status(500).json({

                success:
                    false,

                message:
                    "Something went wrong."

            });

        }

    }
);


/* =========================
   LOGIN
========================= */

app.post(
    "/api/login",
    (req, res) => {


        const {
            login,
            password
        } = req.body;


        if (
            !login ||
            !password
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Username/email and password are required."

            });

        }


        const user =
            findUser(login);


        if (
            !user ||
            !checkPassword(
                password,
                user.password
            )
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Invalid login details."

            });

        }


        req.session.userId =
            user.id;


        req.session.username =
            user.username;


        req.session.role =
            user.role || "user";


        res.json({

            success:
                true,

            username:
                user.username,

            role:
                user.role || "user"

        });

    }
);


/* =========================
   CURRENT USER
========================= */

app.get(
    "/api/me",
    (req, res) => {


        if (
            !req.session.userId
        ) {

            return res.json({

                loggedIn:
                    false

            });

        }


        const user =
            findUserById(
                req.session.userId
            );


        if (!user) {

            req.session.destroy(
                () => {}
            );


            return res.json({

                loggedIn:
                    false

            });

        }


        res.json({

            loggedIn:
                true,

            username:
                user.username,

            role:
                user.role || "user"

        });

    }
);


/* =========================
   OWNER TEST
========================= */

app.get(
    "/api/owner-test",
    requireOwner,
    (req, res) => {


        res.json({

            success:
                true,

            username:
                req.session.username,

            role:
                "owner"

        });

    }
);


/* =========================
   ADD PLUGIN
========================= */

app.post(

    "/api/plugins",

    requireOwner,

    upload.fields([

        {
            name:
                "pluginJar",

            maxCount:
                1
        },

        {
            name:
                "pluginLogo",

            maxCount:
                1
        }

    ]),

    (req, res) => {


        try {


            const {

                pluginName,
                version,
                category,
                price,
                description

            } = req.body;


            if (
                !pluginName ||
                !version ||
                !category ||
                !description
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Required fields are missing."

                });

            }


            if (
                !req.files ||
                !req.files.pluginJar ||
                !req.files.pluginJar[0]
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Plugin JAR is required."

                });

            }


            const jarFile =
                req.files
                    .pluginJar[0];


            const logoFile =
                req.files.pluginLogo
                    ? req.files.pluginLogo[0]
                    : null;


            const data =
                loadPlugins();


            const slug =
                createSlug(
                    pluginName
                );


            if (!slug) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid plugin name."

                });

            }


            if (

                data.plugins.some(

                    plugin =>
                        plugin.slug ===
                        slug

                )

            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "Plugin already exists."

                });

            }


            const plugin = {

                id:
                    Date.now(),

                name:
                    pluginName.trim(),

                slug:

                    slug,

                version:
                    version.trim(),

                category:
                    category.trim(),

                price:
                    Number(price) || 0,

                description:
                    description.trim(),

                jar:
                    jarFile.filename,

                logo:
                    logoFile
                        ? logoFile.filename
                        : null,

                createdAt:
                    new Date().toISOString()

            };


            data.plugins.push(
                plugin
            );


            savePlugins(
                data
            );


            res.json({

                success:
                    true,

                message:
                    "Plugin added successfully.",

                plugin:
                    plugin

            });


        } catch (error) {


            console.error(
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Plugin upload failed."

            });

        }

    }

);


/* =========================
   PLUGIN LIST
========================= */

app.get(
    "/api/plugins",
    (req, res) => {


        const data =
            loadPlugins();


        res.json({

            success:
                true,

            plugins:
                data.plugins

        });

    }
);


/* =========================
   DELETE PLUGIN
========================= */

app.delete(

    "/api/plugins/:slug",

    requireOwner,

    (req, res) => {


        try {


            const data =
                loadPlugins();


            const index =
                data.plugins.findIndex(

                    plugin =>
                        plugin.slug ===
                        req.params.slug

                );


            if (index === -1) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Plugin not found."

                });

            }


            const plugin =
                data.plugins[index];


            /* Delete JAR */

            if (
                plugin.jar
            ) {


                const jarPath =
                    path.join(

                        pluginsDir,

                        plugin.jar

                    );


                if (
                    fs.existsSync(
                        jarPath
                    )
                ) {

                    fs.unlinkSync(
                        jarPath
                    );

                }

            }


            /* Delete logo */

            if (
                plugin.logo
            ) {


                const logoPath =
                    path.join(

                        pluginsDir,

                        plugin.logo

                    );


                if (
                    fs.existsSync(
                        logoPath
                    )
                ) {

                    fs.unlinkSync(
                        logoPath
                    );

                }

            }


            /* Remove plugin */

            data.plugins.splice(
                index,
                1
            );


            savePlugins(
                data
            );


            res.json({

                success:
                    true,

                message:
                    "Plugin deleted successfully."

            });


        } catch (error) {


            console.error(
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to delete plugin."

            });

        }

    }

);


/* =========================
   PLUGIN DOWNLOAD
========================= */

app.get(

    "/api/plugins/:slug/download",

    (req, res) => {


        const data =
            loadPlugins();


        const plugin =
            data.plugins.find(

                item =>
                    item.slug ===
                    req.params.slug

            );


        if (!plugin) {

            return res.status(404).send(

                "Plugin not found."

            );

        }


        const filePath =
            path.join(

                pluginsDir,

                plugin.jar

            );


        if (
            !fs.existsSync(
                filePath
            )
        ) {

            return res.status(404).send(

                "Plugin file not found."

            );

        }


        res.download(

            filePath,

            `${plugin.slug}-${plugin.version}.jar`

        );

    }

);


/* =========================
   PLUGIN ASSETS
========================= */

app.get(

    "/plugin-assets/:filename",

    (req, res) => {


        const filename =
            path.basename(
                req.params.filename
            );


        const filePath =
            path.join(
                pluginsDir,
                filename
            );


        if (
            !fs.existsSync(
                filePath
            )
        ) {

            return res.status(404).send(
                "File not found."
            );

        }


        res.sendFile(
            filePath
        );

    }

);


/* =========================
   LOGOUT
========================= */

app.post(
    "/api/logout",
    (req, res) => {


        req.session.destroy(
            () => {

                res.json({

                    success:
                        true

                });

            }
        );

    }
);


/* =========================
   ERROR HANDLER
========================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {


        console.error(
            error
        );


        res.status(400).json({

            success:
                false,

            message:
                error.message ||
                "Something went wrong."

        });

    }
);


/* =========================
   SERVER
========================= */

app.listen(

    PORT,

    "0.0.0.0",

    () => {


        console.log(

            `Flex Store running at http://localhost:${PORT}`

        );

    }

);
