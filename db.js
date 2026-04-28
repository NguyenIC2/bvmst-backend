const mysql = require("mysql2");

const db = mysql.createConnection(process.env.MYSQL_PUBLIC_URL);

db.connect(err => {
  if (err) {
    console.error("❌ Lỗi kết nối DB:", err);
  } else {
    console.log("✅ MySQL Connected");
  }
});