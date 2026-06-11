Page({
  data: {
    input: "",
    messages: []
  },

  onInput(e) {
    this.setData({
      input: e.detail.value
    });
  },

  async send() {
    const text = this.data.input;
    if (!text) return;

    const messages = this.data.messages;

    messages.push({
      role: "user",
      content: text
    });

    this.setData({ messages, input: "" });

    wx.request({
      url: "http://你的服务器IP:3000/ai/parse",
      method: "POST",
      data: { text },
      success: (res) => {
        const aiText = JSON.stringify(res.data.data);

        messages.push({
          role: "ai",
          content: aiText
        });

        this.setData({ messages });
      }
    });
  }
});