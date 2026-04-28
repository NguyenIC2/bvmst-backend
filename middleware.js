const jwt = require("jsonwebtoken");

const SECRET = "secret123";

function authMiddleware(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ message: "Thiếu token" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Token không hợp lệ" });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Token không hợp lệ" });
    }
}

module.exports = authMiddleware;