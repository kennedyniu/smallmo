require("dotenv").config();
const axios = require("axios");

async function test() {

  const res = await axios.post(
    "https://api.siliconflow.cn/v1/chat/completions",
    {
      model: "deepseek-ai/DeepSeek-V3",
      messages: [
        {
          role: "user",
          content: "你好"
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    }
  );

  console.log(JSON.stringify(res.data, null, 2));
}

test().catch(console.error);
