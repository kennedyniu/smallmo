
const theme = require('./utils/theme.js');
const cloudDb = require('./utils/cloudDb.js');

App({
  onLaunch() {
    const settings = wx.getStorageSync('settings') || {};
    if (settings.enableCloud !== false) {
      settings.enableCloud = false;
      wx.setStorageSync('settings', settings);
    }

    this.initCloud();


    this.initData();
   
    this.applyTheme();

    this.handleDefaultTab();
  },

  // 处理默认打开界面
  handleDefaultTab() {
    const settings = wx.getStorageSync('settings') || {};
    const defaultTab = settings.defaultTab || wx.getStorageSync('defaultTab') || 'detail';

    // tabBar 页面映射
    const tabMap = {
      'detail': '/pages/detail/detail',
      'chart': '/pages/chart/chart',
      'add': '/pages/add/add',
      'mine': '/pages/mine/mine'
    };

    const targetPage = tabMap[defaultTab];
    if (targetPage && defaultTab !== 'detail') {
      wx.switchTab({ url: targetPage });
    }
  },

  // 初始化云开发
  initCloud() {
    cloudDb.initCloud();
  },

  // 全局数据
  globalData: {
    theme: 'simple', // 当前主题
    currentAccount: null, // 当前账本
    openid: null, // 用户openid
    cloudSynced: false, // 是否已从云端同步过数据
  },

  // 初始化数据
  initData() {
    const accounts = wx.getStorageSync('accounts');
    if (!accounts || accounts.length === 0) {
      // 初始化默认账本
      const defaultAccount = {
        id: this.generateId(),
        name: '默认账本',
        createTime: Date.now()
      };
      wx.setStorageSync('accounts', [defaultAccount]);
      wx.setStorageSync('currentAccount', defaultAccount.id);
    }

    // 初始化分类
    const categories = wx.getStorageSync('categories');
    if (!categories) {
      wx.setStorageSync('categories', {
        expense: [
          { id: 'e1', name: '餐饮', icon: '🍔' },
          { id: 'e2', name: '交通', icon: '🚗' },
          { id: 'e3', name: '购物', icon: '🛍️' },
          { id: 'e4', name: '娱乐', icon: '🎮' },
          { id: 'e5', name: '居住', icon: '🏠' },
          { id: 'e6', name: '医疗', icon: '💊' },
          { id: 'e7', name: '教育', icon: '📚' },
          { id: 'e8', name: '长辈', icon: '👴' },
          { id: 'e9', name: '孩子', icon: '👶' },
          { id: 'e10', name: '旅游', icon: '✈️' },
          { id: 'e11', name: '其他', icon: '📦' }
        ],
        income: [
          { id: 'i1', name: '工资', icon: '💰' },
          { id: 'i2', name: '奖金', icon: '🎁' },
          { id: 'i3', name: '理财', icon: '📈' },
          { id: 'i4', name: '红包', icon: '🧧' },
          { id: 'i5', name: '其他', icon: '💵' }
        ]
      });
    }
    // 初始化设置
    const settings = wx.getStorageSync('settings');
    if (!settings) {
      wx.setStorageSync('settings', { theme: 'simple' });
    }
    this.globalData.theme = wx.getStorageSync('settings').theme || 'simple';
    this.globalData.currentAccount = wx.getStorageSync('currentAccount');

    // 从云端同步数据
    this.syncDataFromCloud();
  },

  // 从云端同步数据
  async syncDataFromCloud() {
    // 只从云端拉取数据到本地，不上传本地数据
    const success = await cloudDb.syncFromCloud();
    if (success) {
      this.globalData.cloudSynced = true;
    }
  },

  // 把本地数据同步到云端
  async syncLocalToCloud() {
    // 直接调用 syncFromCloud 即可，它会合并本地和云端数据
    // 然后把本地多出的数据同步到云端
    await cloudDb.syncFromCloud();
    console.log('本地数据已同步到云端');
  },

  // 应用主题
  applyTheme() {
    const settings = wx.getStorageSync('settings') || {};
    const themeName = settings.theme || 'simple';
    const config = theme.getThemeConfig(themeName);

    // 设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: config.navText,
      backgroundColor: config.navBg,
      animation: {
        duration: 300,
        timingFunc: 'easeInOut'
      }
    });

    // 设置底部TabBar颜色
    wx.setStorageSync('currentTheme', themeName);
  },

  // 切换主题
  switchTheme(themeName) {
    this.globalData.theme = themeName;
    this.applyTheme();
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      path: '/pages/detail/detail',
      imageUrl: '/images/share.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      query: '',
      imageUrl: '/images/share.png'
    };
  },

  // 生成唯一ID
  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // 获取主题配置
  getTheme() {
    const settings = wx.getStorageSync('settings') || {};
    return settings.theme || 'simple';
  }
});