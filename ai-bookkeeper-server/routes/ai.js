const express = require("express");
const router = express.Router();

const { chat } = require("../services/siliconflow");

router.post("/parse", async (req, res) => {

  try {

    const { text } = req.body;

    const prompt = `
你是专业AI记账助手。

请从用户输入中提取账单信息。

仅返回JSON，不要返回任何解释：

{
  "amount": 数字,
  "category": "分类",
  "remark": "备注"
}

分类只能是：

餐饮
交通
购物
娱乐
学习
医疗
其他

用户输入：
${text}
`;

    const result = await chat(prompt);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});

module.exports = router;
