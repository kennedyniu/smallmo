require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json());

// 测试接口
app.get("/", (req, res) => {
  res.send("OK");
});

// 路由
app.use("/bill", require("./routes/bill"));

app.listen(3000, () => {
  console.log("server running 3000");
  console.log("KEY =", process.env.SILICONFLOW_API_KEY ? "loaded" : "missing");
});