const axios = require("axios");

async function chat(prompt) {
  const url = "https://api.siliconflow.cn/v1/chat/completions";

  try {
    const resp = await axios.post(
      url,
      {
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 512,
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    return resp.data.choices[0].message.content;

  } catch (err) {
    console.error("❌ SiliconFlow错误：", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { chat };