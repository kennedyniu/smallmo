const pool = require("../config/db");

// 插入账单
async function addBill({ user_id, amount, category, remark }) {
  const [result] = await pool.query(
    "INSERT INTO bill (user_id, amount, category, remark) VALUES (?, ?, ?, ?)",
    [user_id, amount, category, remark]
  );

  return result;
}

// 查询账单
async function listBills(user_id = "demo") {
  const [rows] = await pool.query(
    "SELECT * FROM bill WHERE user_id = ? ORDER BY create_time DESC",
    [user_id]
  );

  return rows;
}

module.exports = {
  addBill,
  listBills
};