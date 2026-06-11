// pages/ai/ai.js
const storage = require('../../utils/storage.js');
const app = getApp();

Page({
  data: {
    messages: [
      { role: 'ai', content: '你好！我是记账助手，请输入消费内容。' }
    ],
    input: '',
    isLoading: false,
    scrollTop: 0,
    currentTheme: 'simple',
    themeColors: {
      primary: '#007AFF',
      background: '#f5f5f5',
      cardBg: '#ffffff',
      text: '#333333'
    }
  },

  onLoad() {
    this.applyTheme();
  },

  onShow() {
    this.applyTheme();
  },

  applyTheme() {
    const settings = storage.getSettings();
    const theme = settings.theme || 'simple';
    
    // 修改这里：暗色主题的 primary 不能是白色！
    const themeConfig = {
      simple: {
        primary: '#007AFF',
        background: '#f5f5f5',
        cardBg: '#ffffff',
        text: '#333333'
      },
      dark: {
        primary: '#2c2c2e', // ✅ 改为深灰色，这样白色文字能看见
        background: '#1a1a1a',
        cardBg: '#2c2c2e', // ✅ 也改为深灰色
        text: '#e0e0e0'
      },
      pink: {
        primary: '#ff55a0',
        background: '#fff0f5',
        cardBg: '#ffffff',
        text: '#333333'
      },
      male: {
        primary: '#1890ff',
        background: '#f0f2f5',
        cardBg: '#ffffff',
        text: '#333333'
      },
      cute: {
        primary: '#ff9500',
        background: '#fff9f0',
        cardBg: '#ffffff',
        text: '#663300'
      }
    };

    const colors = themeConfig[theme] || themeConfig.simple;
    
    this.setData({
      currentTheme: theme,
      themeColors: colors
    });

    // 设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: theme === 'dark' ? '#ffffff' : '#000000',
      backgroundColor: colors.primary,
      animation: { duration: 0 }
    });
  },

  // ... 其他代码保持不变 ...
  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  sendMsg() {
    const text = this.data.input.trim();
    if (!text || this.data.isLoading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...this.data.messages, userMsg];
    this.setData({ messages: newMessages, input: '', isLoading: true });

    wx.request({
      url: 'https://houduan.cylife.top/ai/parse',
      method: 'POST',
      data: { text },
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.data && res.data.success) {
          let rawText = res.data.data;
          if (rawText.includes('```json')) {
            rawText = rawText.replace(/```json|```/g, '').trim();
          }
          try {
            const billData = JSON.parse(rawText);
            
            const categories = storage.getCategories();
            const expenseCategories = categories.expense || [];
            const matchedCategory = expenseCategories.find(cat => cat.name === billData.category);
            const categoryId = matchedCategory ? matchedCategory.id : '';
            
            const accounts = storage.getAccounts();
            const defaultAccountId = accounts.length > 0 ? accounts[0].id : '1';
            const accountId = storage.getCurrentAccountId() || defaultAccountId;
            
            const newBill = {
              id: storage.generateId(),
              amount: billData.amount,
              categoryId: categoryId,
              type: 'expense',
              date: new Date().toISOString(),
              remark: billData.remark || '',
              accountId: accountId,
              createTime: Date.now(),
              updateTime: Date.now()
            };
            
            storage.addBill(newBill);
            
            const aiContent = `✅ 识别成功！已同步到各页面。\n💰 金额：${billData.amount}元\n🏷️ 分类：${billData.category}\n📝 备注：${billData.remark}`;
            this.setData({
              messages: [...newMessages, { role: 'ai', content: aiContent }]
            });

          } catch (e) {
            this.setData({
              messages: [...newMessages, { role: 'ai', content: '❌ 数据解析失败' }]
            });
          }
        } else {
          this.setData({
            messages: [...newMessages, { role: 'ai', content: '❌ 后端返回异常' }]
          });
        }
      },
      fail: () => {
        this.setData({
          messages: [...newMessages, { role: 'ai', content: '❌ 网络请求失败' }]
        });
      },
      complete: () => {
        this.setData({ isLoading: false });
        this.setData({ scrollTop: 999999 });
      }
    });
  }
});