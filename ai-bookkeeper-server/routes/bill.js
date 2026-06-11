const express = require("express");
const router = express.Router();

const { chat } = require("../services/siliconflow");
const { addBill, listBills } = require("../services/billService");

/**
 * 🧠 安全解析AI返回JSON（防止```、废话、中文解释）
 */
function extractJSON(text) {
  try {
    if (!text) throw new Error("empty response");

    let cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("NO_JSON_FOUND");
    }

    const jsonStr = cleaned.slice(start, end + 1);

    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("❌ AI返回解析失败：", text);
    throw new Error("AI返回不是标准JSON");
  }
}
router.post("/add", async (req, res) => {
  try {
    const { text, user_id = "demo" } = req.body;

    if (!text) {
      return res.json({
        success: false,
        error: "text不能为空"
      });
    }

    console.log("📥 收到请求:", text);

    const prompt = `
你是专业记账AI助手。

⚠️ 必须严格只输出JSON，不允许任何解释、不允许markdown：

{
  "amount": number,
  "category": "餐饮/交通/购物/娱乐/学习/医疗/其他",
  "remark": "一句话描述"
}

规则：
- amount必须是数字
- category必须从枚举中选择
- remark必须简短

用户输入：
${text}
`;

    console.log("🤖 调用AI...");

    const result = await chat(prompt);

    console.log("🤖 AI返回:", result);

    const bill = extractJSON(result);

    // 基础校验（防AI胡写）
    if (!bill.amount || !bill.category) {
      return res.json({
        success: false,
        error: "AI字段不完整",
        raw: result
      });
    }

    const saved = await addBill({
      user_id,
      amount: Number(bill.amount),
      category: bill.category,
      remark: bill.remark || ""
    });

    res.json({
      success: true,
      data: {
        id: saved.insertId,
        ...bill
      }
    });

  } catch (err) {
    console.error(err);

    res.json({
      success: false,
      error: err.message
    });
  }
});
router.get("/list", async (req, res) => {
  try {
    const user_id = req.query.user_id || "demo";

    const data = await listBills(user_id);

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});
router.get("/summary", async (req, res) => {
  try {
    const user_id = req.query.user_id || "demo";

    const data = await listBills(user_id);

    const prompt = `
你是专业财务分析AI。

请分析以下消费记录：

${JSON.stringify(data)}

请输出：
1. 今日总消费
2. 各分类占比
3. 一句生活建议（必须具体）
`;

    const result = await chat(prompt);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});
module.exports = router;