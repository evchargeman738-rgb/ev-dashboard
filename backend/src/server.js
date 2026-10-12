const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const logRoutes = require("./routes/logRoutes");
const serverLogRoutes = require("./routes/serverLogRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");
const chargerRoutes = require("./routes/chargerRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const userRoutes = require("./routes/userRoutes");
const walletRoutes = require("./routes/walletRoutes");
const accountInfoRoutes = require("./routes/accountInfoRoutes");
const appVersionRoutes = require("./routes/appVersionRoutes");
const configDataRoutes = require("./routes/configDataRoutes");
const devicesMasterRoutes = require("./routes/devicesMasterRoutes");
const socketInfoRoutes = require("./routes/socketInfoRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const permissionsRoutes = require("./routes/permissionsRoutes");

const authRoutes = require("./routes/authRoutes");
const { requireAuth } = require("./middleware/authMiddleware");

// ======================================================
// CREATE APP
// ======================================================

const app = express();

// Render / reverse-proxy configuration
app.set("trust proxy", 1);

// ======================================================
// CORS CONFIGURATION
// ======================================================

const allowedOrigins = new Set([
    // Custom production domain
    "https://ev-dashboard.app",

    // Vercel main deployment
    "https://frontend-git-main-gowthamis-projects-9db3e52a.vercel.app",
    "https://ev-dashboard-vmro.vercel.app",

    // Local development
    "http://localhost:4200",
    "http://127.0.0.1:4200"
]);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no Origin header
            // Example: server-to-server/direct API requests.
            if (!origin) {
                return callback(null, true);
            }

            // Explicitly allowed origins
            if (allowedOrigins.has(origin)) {
                return callback(null, true);
            }

            // Allow Vercel deployments belonging to this project
            const isVercelDeployment =
                /^https:\/\/frontend-[a-z0-9-]+-gowthamis-projects-9db3e52a\.vercel\.app$/.test(origin) ||
                /^https:\/\/ev-dashboard-vmro(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?\.vercel\.app$/.test(origin);

            if (isVercelDeployment) {
                return callback(null, true);
            }

            console.error("❌ CORS blocked origin:", origin);

            return callback(
                new Error("CORS origin not allowed")
            );
        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],

        credentials: false
    })
);

// ======================================================
// BODY PARSER
// ======================================================

app.use(express.json());

// ======================================================
// AUTH ENVIRONMENT CHECK
// ======================================================

console.log("");
console.log("======================================");
console.log("🔐 AUTH CONFIG CHECK");
console.log("======================================");

console.log(
    "ADMIN_USERNAME configured:",
    Boolean(process.env.ADMIN_USERNAME)
);

console.log(
    "ADMIN_PASSWORD_HASH configured:",
    Boolean(process.env.ADMIN_PASSWORD_HASH)
);

console.log(
    "AUTH_SECRET configured:",
    Boolean(process.env.AUTH_SECRET)
);

console.log(
    "ADMIN_USERNAME length:",
    process.env.ADMIN_USERNAME
        ? process.env.ADMIN_USERNAME.length
        : 0
);

console.log(
    "ADMIN_PASSWORD_HASH length:",
    process.env.ADMIN_PASSWORD_HASH
        ? process.env.ADMIN_PASSWORD_HASH.length
        : 0
);

console.log(
    "AUTH_SECRET length:",
    process.env.AUTH_SECRET
        ? process.env.AUTH_SECRET.length
        : 0
);

console.log("======================================");
console.log("");

// ======================================================
// LOGIN RATE LIMIT
// ======================================================

const loginAttempts = new Map();

app.use(
    "/api/auth/login",
    (req, res, next) => {
        const key = req.ip || "unknown";
        const now = Date.now();

        const attempt = loginAttempts.get(key) || {
            count: 0,
            resetAt: now + 15 * 60 * 1000
        };

        if (now > attempt.resetAt) {
            attempt.count = 0;
            attempt.resetAt = now + 15 * 60 * 1000;
        }

        if (attempt.count >= 5) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many login attempts. Try again later."
            });
        }

        attempt.count += 1;
        loginAttempts.set(key, attempt);

        const originalJson = res.json.bind(res);

        res.json = (body) => {
            if (body?.success) {
                loginAttempts.delete(key);
            }

            return originalJson(body);
        };

        return next();
    }
);

// ======================================================
// AUTH ROUTES
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);

// ======================================================
// PROTECTED API ROUTES
// ======================================================

app.use(
    "/api",
    requireAuth
);

// ======================================================
// LOG ROUTES
// ======================================================

app.use(
    "/api/logs",
    logRoutes
);

app.use(
    "/api/server-logs",
    serverLogRoutes
);

// ======================================================
// ROOT
// ======================================================

app.get(
    "/",
    (req, res) => {
        res.json({
            success: true,
            message: "EV Dashboard Backend is running"
        });
    }
);

// ======================================================
// DATABASE TEST
// ======================================================

app.get(
    "/api/test-db",
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                "SELECT 1 AS connected"
            );

            return res.json({
                success: true,
                message:
                    "Database connected successfully",
                data: rows
            });

        } catch (error) {
            console.error(
                "❌ Database error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Database connection failed",
                error: error.message
            });
        }
    }
);

// ======================================================
// DASHBOARD
// ======================================================

app.use(
    "/api/dashboard",
    dashboardRoutes
);

// ======================================================
// CHARGERS
// ======================================================

app.use(
    "/api/chargers",
    chargerRoutes
);

// ======================================================
// CHARGE TRANSACTIONS
// ======================================================

app.use(
    "/api/charge-transactions",
    transactionRoutes
);

// ======================================================
// USERS
// ======================================================

app.use(
    "/api/users",
    userRoutes
);

// ======================================================
// WALLET
// ======================================================

app.use(
    "/api/wallet",
    walletRoutes
);

// ======================================================
// ACCOUNT INFO
// ======================================================

app.use(
    "/api/account-info",
    accountInfoRoutes
);

// ======================================================
// APP VERSION
// ======================================================

app.use(
    "/api/app-version",
    appVersionRoutes
);

// ======================================================
// CONFIG DATA
// ======================================================

app.use(
    "/api/config-data",
    configDataRoutes
);

// ======================================================
// DEVICES MASTER
// ======================================================

app.use(
    "/api/devices-master",
    devicesMasterRoutes
);

// ======================================================
// SOCKET INFO
// ======================================================

app.use(
    "/api/socket-info",
    socketInfoRoutes
);

// ======================================================
// ANALYTICS
// ======================================================

app.use(
    "/api/analytics",
    analyticsRoutes
);

// ======================================================
// USER PERMISSIONS
// ======================================================

app.use(
    "/api/permissions",
    permissionsRoutes
);

// ======================================================
// 404 HANDLER
// ======================================================

app.use(
    (req, res) => {
        return res.status(404).json({
            success: false,
            message:
                `Route not found: ${req.method} ${req.originalUrl}`
        });
    }
);

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
    (err, req, res, next) => {
        console.error(
            "❌ Express error:",
            err
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
);

// ======================================================
// SERVER
// ======================================================

const PORT =
    process.env.PORT || 5000;

const server = app.listen(
    PORT,
    () => {
        console.log("");
        console.log(
            "======================================"
        );
        console.log(
            "🚀 EV Dashboard Backend Started"
        );
        console.log(
            "======================================"
        );

        console.log(
            `🌐 Server: http://localhost:${PORT}`
        );

        console.log(
            `📊 Dashboard: http://localhost:${PORT}/api/dashboard`
        );

        console.log(
            `🔌 Chargers: http://localhost:${PORT}/api/chargers`
        );

        console.log(
            `⚡ Transactions: http://localhost:${PORT}/api/charge-transactions`
        );

        console.log(
            `👤 Users: http://localhost:${PORT}/api/users`
        );

        console.log(
            `💰 Wallet: http://localhost:${PORT}/api/wallet`
        );

        console.log(
            `📋 Account Info: http://localhost:${PORT}/api/account-info`
        );

        console.log(
            `📱 App Versions: http://localhost:${PORT}/api/app-version`
        );

        console.log(
            `⚙️ Config Data: http://localhost:${PORT}/api/config-data`
        );

        console.log(
            `🔌 Devices Master: http://localhost:${PORT}/api/devices-master`
        );

        console.log(
            `📡 Socket Info: http://localhost:${PORT}/api/socket-info`
        );

        console.log(
            `📈 Analytics: http://localhost:${PORT}/api/analytics`
        );

        console.log(
            `🗄️ DB Test: http://localhost:${PORT}/api/test-db`
        );

        console.log(
            "======================================"
        );

        console.log("");

        // Safe database diagnostics
        console.log(
            "DB_HOST:",
            process.env.DB_HOST
        );

        console.log(
            "DB_PORT:",
            process.env.DB_PORT
        );

        console.log(
            "DB_USER:",
            process.env.DB_USER
        );

        console.log(
            "DB_NAME:",
            process.env.DB_NAME
        );

        console.log(
            "DB_PASSWORD exists:",
            Boolean(process.env.DB_PASSWORD)
        );

        console.log("");
    }
);

// ======================================================
// SERVER ERROR
// ======================================================

server.on(
    "error",
    (error) => {
        console.error("");
        console.error(
            "======================================"
        );
        console.error(
            "❌ SERVER STARTUP ERROR"
        );
        console.error(
            "======================================"
        );
        console.error(error);
        console.error(
            "======================================"
        );

        if (error.code === "EADDRINUSE") {
            console.error(
                `❌ Port ${PORT} is already being used by another process.`
            );
        }
    }
);