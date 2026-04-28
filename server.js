const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

// ===== CONFIG =====
const SECRET = "secret123";

// ===== MIDDLEWARE =====
app.use(cors()); // 🔥 FIX CORS
app.use(express.json());

// ===== DB CONNECT =====
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect(err => {
  if (err) {
    console.log("❌ DB lỗi:", err);
  } else {
    console.log("✅ MySQL Connected");
  }
});

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token sai" });
    req.user = user;
    next();
  });
}

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("API running");
});

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.json({ message: "Thiếu dữ liệu" });
  }

  const hashed = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, 'patient')",
    [name, phone, hashed],
    err => {
      if (err) {
        console.log(err);
        return res.json({ message: "Lỗi đăng ký" });
      }
      res.json({ message: "Đăng ký thành công" });
    }
  );
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  const { phone, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE phone = ?",
    [phone],
    async (err, result) => {
      if (err) return res.json(err);

      if (result.length === 0) {
        return res.json({ message: "Sai tài khoản" });
      }

      const user = result[0];

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.json({ message: "Sai mật khẩu" });
      }

      const token = jwt.sign({ id: user.id }, SECRET, {
        expiresIn: "1h",
      });

      res.json({
        message: "Đăng nhập thành công",
        token,
      });
    }
  );
});

// ===== GET SLOTS =====
app.get("/slots", (req, res) => {
  db.query("SELECT * FROM time_slots", (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

// ===== BOOK =====
app.post("/book", auth, (req, res) => {
  const { time_slot_id } = req.body;
  const userId = req.user.id;

  db.query(
    "SELECT * FROM time_slots WHERE id = ?",
    [time_slot_id],
    (err, result) => {
      if (err) return res.json(err);

      if (result.length === 0) {
        return res.json({ message: "Slot không tồn tại" });
      }

      if (result[0].is_booked === 1) {
        return res.json({ message: "Slot đã được đặt" });
      }

      db.query(
        "INSERT INTO appointments (user_id, time_slot_id) VALUES (?, ?)",
        [userId, time_slot_id],
        err => {
          if (err) return res.json(err);

          db.query(
            "UPDATE time_slots SET is_booked = 1 WHERE id = ?",
            [time_slot_id]
          );

          res.json({ message: "Đặt lịch thành công" });
        }
      );
              app.post("/cancel", authenticateToken, async (req, res) => {
          const { time_slot_id } = req.body;

          await db.query(
            "UPDATE time_slots SET is_booked = 0 WHERE id = $1",
            [time_slot_id]
          );

          res.json({ message: "Đã hủy lịch thành công" });
        });
    }
  );
});

// ===== MY APPOINTMENTS =====
app.get("/my-appointments", auth, (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT 
      a.id,
      t.date,
      t.time_start,
      t.time_end
     FROM appointments a
     JOIN time_slots t ON a.time_slot_id = t.id
     WHERE a.user_id = ?`,
    [userId],
    (err, result) => {
      if (err) return res.json(err);
      res.json(result);
    }
  );
});

// ===== CANCEL =====
app.delete("/cancel/:id", auth, (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT * FROM appointments WHERE id = ?",
    [id],
    (err, result) => {
      if (result.length === 0) {
        return res.json({ message: "Không tìm thấy lịch" });
      }

      const slotId = result[0].time_slot_id;

      db.query("DELETE FROM appointments WHERE id = ?", [id], err => {
        if (err) return res.json(err);

        db.query(
          "UPDATE time_slots SET is_booked = 0 WHERE id = ?",
          [slotId]
        );

        res.json({ message: "Đã hủy lịch" });
      });
    }
  );
});

// ===== RUN =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});