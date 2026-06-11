// utils/theme.js - 主题配置文件
const themes = {
  // 简约现代 - 默认
  simple: {
    primary: '#1890ff',
    secondary: '#52c41a',
    bg: '#f5f5f5',
    cardBg: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e8e8e8',
    expense: '#ff4d4f',
    income: '#52c41a',
    tabBg: '#ffffff',
    navBg: '#ffffff',
    navText: '#333333'
  },
  // 暗色主题
  dark: {
    primary: '#1890ff',
    secondary: '#52c41a',
    bg: '#1a1a1a',
    cardBg: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#999999',
    border: '#3a3a3a',
    expense: '#ff6b6b',
    income: '#69db7c',
    tabBg: '#2a2a2a',
    navBg: '#2a2a2a',
    navText: '#ffffff'
  },
  // 男性商务款
  male: {
    primary: '#1a237e',
    secondary: '#0d47a1',
    bg: '#eceff1',
    cardBg: '#ffffff',
    text: '#263238',
    textSecondary: '#546e7a',
    border: '#cfd8dc',
    expense: '#d32f2f',
    income: '#388e3c',
    tabBg: '#ffffff',
    navBg: '#1a237e',
    navText: '#ffffff'
  },
  // 女性优雅款
  female: {
    primary: '#ec407a',
    secondary: '#ab47bc',
    bg: '#fce4ec',
    cardBg: '#ffffff',
    text: '#4a148c',
    textSecondary: '#7b1fa2',
    border: '#f8bbd0',
    expense: '#e91e63',
    income: '#9c27b0',
    tabBg: '#ffffff',
    navBg: '#ec407a',
    navText: '#ffffff'
  },
  // 可爱萌系款
  cute: {
    primary: '#ffb74d',
    secondary: '#ff8a65',
    bg: '#fff3e0',
    cardBg: '#ffffff',
    text: '#5d4037',
    textSecondary: '#8d6e63',
    border: '#ffcc80',
    expense: '#ff7043',
    income: '#66bb6a',
    tabBg: '#ffffff',
    navBg: '#ffb74d',
    navText: '#5d4037'
  }
};

/**
 * 获取主题配置
 */
function getThemeConfig(themeName) {
  return themes[themeName] || themes.simple;
}

/**
 * 判断颜色是否为深色
 */
function isDarkColor(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

/**
 * 应用主题到页面
 */
function applyThemeToPage(page) {
  const settings = wx.getStorageSync('settings') || {};
  const themeName = settings.theme || 'simple';
  const config = getThemeConfig(themeName);

  page.setData({
    theme: themeName,
    themeConfig: config
  });

  // 设置导航栏颜色（根据背景色亮度自动判断前景色）
  const frontColor = isDarkColor(config.navBg) ? '#ffffff' : '#000000';
  wx.setNavigationBarColor({
    frontColor: frontColor,
    backgroundColor: config.navBg,
    animation: {
      duration: 0,
      timingFunc: 'easeInOut'
    }
  });

  return config;
}

module.exports = {
  themes,
  getThemeConfig,
  applyThemeToPage
};