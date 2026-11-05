import express from "express";
import fetch from "node-fetch";
import path from "node:path";
import chalk from "chalk";
import { timingSafeEqual } from "node:crypto";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "../public");

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const PROXY_TOKEN = process.env.PROXY_TOKEN;
const ANILIST_API = "https://graphql.anilist.co";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

const proxyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests" },
});

function safeCompare(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

app.post("/anilist", proxyLimiter, async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        const expected = `Bearer ${PROXY_TOKEN}`;

        if (!PROXY_TOKEN || !safeCompare(auth, expected)) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }

        if (typeof req.body?.query !== "string" || req.body.query.trim() === "") {
            return res.status(400).json({
                error: "Invalid GraphQL body: 'query' must be a non-empty string",
            });
        }

        if (
            req.body.variables !== undefined &&
            (typeof req.body.variables !== "object" || req.body.variables === null)
        ) {
            return res.status(400).json({
                error: "Invalid GraphQL body: 'variables' must be an object",
            });
        }

        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 30000);

        let response;

        try {
            response = await fetch(ANILIST_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "User-Agent": "ReineDiscordBot/2.0",
                },
                body: JSON.stringify({
                    query: req.body.query,
                    variables: req.body.variables,
                }),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
        const contentLength = response.headers.get("content-length");
        if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
            return res.status(502).json({
                error: "Upstream response too large",
            });
        }

        const text = await response.text();

        if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
            return res.status(502).json({
                error: "Upstream response too large",
            });
        }

        const forwardedHeaders = [
            "Retry-After",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        ];

        for (const header of forwardedHeaders) {
            const value = response.headers.get(header);

            if (value) {
                res.setHeader(header, value);
            }
        }

        res.status(response.status);
        res.setHeader(
            "Content-Type",
            response.headers.get("Content-Type") || "application/json; charset=utf-8",
        );

        if (!response.ok) {
            console.error(chalk.red("[AniList]"), `HTTP ${response.status}`);
        }

        return res.send(text);
    } catch (err) {
        if (err.name === "AbortError") {
            console.error(chalk.red("[Proxy]"), "Request timed out");

            return res.status(504).json({
                error: "Gateway Timeout",
            });
        }

        console.error(chalk.red("[Proxy]"), err.message);

        return res.status(500).json({
            error: "Proxy internal error",
            message: err.message,
        });
    }
});

app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Invalid JSON body" });
    }
    console.error(chalk.red("[Proxy]"), err.message);
    res.status(500).json({ error: "Internal error" });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(chalk.magenta("[PROXY]"), chalk.white(`Listening on port ${PORT}`));
});
