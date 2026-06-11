// custom-tab-bar/index.js
Component({
  data: {
    currentIndex: 0,
    targetIndex: -1, // 目标索引（正在切换中）
    theme: 'simple',
    list: [
      {
        pagePath: '/pages/detail/detail',
        text: '明细',
        icon: 'list',
        activeIcon: 'list'
      },
      {
        pagePath: '/pages/chart/chart',
        text: '图表',
        icon: 'chart',
        activeIcon: 'chart'
      },
      {
        pagePath: '/pages/add/add',
        text: '记账',
        icon: 'add',
        activeIcon: 'add'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        icon: 'user',
        activeIcon: 'user'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const pagePath = this.data.list[index].pagePath;

      // 记录目标索引，表示正在切换
      this.setData({ targetIndex: index });

      wx.switchTab({ url: pagePath });
    },

    updateCurrentIndex() {
      // 如果正在切换tab，使用目标索引
      if (this.data.targetIndex !== -1) {
        this.setData({
          currentIndex: this.data.targetIndex,
          targetIndex: -1
        });
        return;
      }

      const pages = getCurrentPages();
      let index = this.data.currentIndex;

      if (pages.length > 0) {
        const currentPath = '/' + pages[pages.length - 1].route;
        const foundIndex = this.data.list.findIndex(item => item.pagePath === currentPath);
        if (foundIndex !== -1) {
          index = foundIndex;
        }
      }

      this.setData({ currentIndex: index });
    },

    applyTheme() {
      const theme = wx.getStorageSync('currentTheme') || 'simple';
      this.setData({ theme });

      // 主题颜色配置
      const themeColors = {
        simple: { primary: '#1890ff', bg: '#ffffff', text: '#8c8c8c', border: '#f0f0f0' },
        dark: { primary: '#1890ff', bg: '#1a1a1a', text: '#8c8c8c', border: '#303030' },
        male: { primary: '#1a237e', bg: '#ffffff', text: '#757575', border: '#e0e0e0' },
        female: { primary: '#ec407a', bg: '#ffffff', text: '#9c27b0', border: '#f8bbd0' },
        cute: { primary: '#ff9800', bg: '#ffffff', text: '#8d6e63', border: '#ffe0b2' }
      };

      const colors = themeColors[theme] || themeColors.simple;

      this.setData({
        '--primary-color': colors.primary,
        '--tab-bg': colors.bg,
        '--text-secondary': colors.text,
        '--border-color': colors.border
      });
    }
  },

  lifetimes: {
    attached() {
      // 监听主题变化
      this.applyTheme();

      // 延迟获取页面信息，确保页面栈已准备好
      setTimeout(() => {
        this.updateCurrentIndex();
      }, 200);
    }
  },

  pageLifetimes: {
    show() {
      // 每次显示时更新当前索引
      setTimeout(() => {
        this.updateCurrentIndex();
      }, 100);
    }
  }
});