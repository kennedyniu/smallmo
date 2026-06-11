// pages/mine/mine.js
const storage = require('../../utils/storage.js');
const excel = require('../../utils/excel.js');
const theme = require('../../utils/theme.js');

Page({
  data: {
    theme: 'simple',
    accounts: [],
    currentAccountId: '',
    showAccountManage: false,
    showImportExport: false,
    billCount: 0,
    accountCount: 0,
    recordingDays: 0,

    // 导出相关
    showExportModal: false,
    dateRangeList: ['本月', '上月', '本年', '上年', '自定义'],
    dateRangeIndex: 0,
    customStartDate: '',
    customEndDate: '',
    selectedExportAccounts: [],
    accountCheckedMap: {},

    // 添加账本
    showAddAccountInline: false,
    newAccountName: '',

    // 删除账本相关
    showDeleteAccountModal: false,
    deleteAccountTarget: {}, // {id, name, billCount}
    showMigrateAccountModal: false,
    migrateAccountOptions: [],
    selectedMigrateAccountId: '',

    // 编辑账本名称
    editingAccountId: '',
    editingAccountName: '',

    // 默认界面设置
    showDefaultTab: false,
    defaultTab: 'detail',

    // 云同步设置（默认关闭）
    enableCloud: false
  },

  onLoad() {
    // 启用分享菜单
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });

    this.loadData();
  },

  onShareAppMessage() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      path: '/pages/mine/mine',
      imageUrl: '/images/share.png'
    };
  },

  onShareTimeline() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      imageUrl: '/images/share.png'
    };
  },

  onShow() {
    // 离开明细页时清除搜索条件
    wx.setStorageSync('clearDetailSearch', true);

    this.loadData();
    this.applyTheme();

    // 更新自定义 tabBar 的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        currentIndex: 3  // 我的页是第 3 个
      });
    }
  },

  // 应用主题
  applyTheme() {
    const theme = storage.getSettings().theme || 'simple';
    this.setData({ theme });
    wx.setStorageSync('currentTheme', theme);

    // 设置导航栏颜色
    const config = require('../../utils/theme.js').getThemeConfig(theme);
    this.setNavigationBarColor(config);
  },

  // 加载数据
  loadData() {
    const accounts = storage.getAccounts();
    const currentAccountId = storage.getCurrentAccountId();
    const bills = storage.getBills();

    // 计算记账天数（去重日期）
    const dateMap = {};
    for (let i = 0; i < bills.length; i++) {
      const date = new Date(bills[i].date);
      const dateKey = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
      dateMap[dateKey] = true;
    }
    const recordingDays = Object.keys(dateMap).length;

    // 获取默认界面设置（优先从 storage 读取，兼容旧数据）
    const settings = storage.getSettings();
    const defaultTab = settings.defaultTab || wx.getStorageSync('defaultTab') || 'detail';
    const enableRecentCategorySort = settings.enableRecentCategorySort !== false;
    const enableCloud = settings.enableCloud === true; // true=开启，false/undefined=关闭（默认）

    const defaultTabOptions = ['明细', '图表', '记账', '我的'];
    const defaultTabValues = ['detail', 'chart', 'add', 'mine'];
    const defaultTabIndex = defaultTabValues.indexOf(defaultTab);

    this.setData({
      accounts,
      currentAccountId,
      billCount: bills.length,
      accountCount: accounts.length,
      recordingDays,
      defaultTab,
      defaultTabOptions,
      defaultTabIndex: defaultTabIndex >= 0 ? defaultTabIndex : 0,
      enableRecentCategorySort,
      enableCloud
    });
  },
goAI() {
  wx.navigateTo({
    url: "/pages/ai/ai"
  })
},
  // 切换默认界面展开状态
  toggleDefaultTab() {
    this.setData({
      showDefaultTab: !this.data.showDefaultTab
    });
  },

  // 设置默认界面
  setDefaultTab(e) {
    const tab = e.currentTarget.dataset.tab;
    wx.setStorageSync('defaultTab', tab);
    // 同时同步到云端（通过 settings）
    storage.updateSettings({ defaultTab: tab });
    this.setData({ defaultTab: tab, showDefaultTab: false });
  },

  // 切换常用类别排序
  toggleRecentCategorySort(e) {
    const enableRecentCategorySort = e.detail.value;
    storage.updateSettings({ enableRecentCategorySort });
    this.setData({ enableRecentCategorySort });
  },

  // 切换云同步
  toggleCloudSync(e) {
    const enableCloud = e.detail.value;
    storage.updateSettings({ enableCloud });
    this.setData({ enableCloud });

    if (enableCloud) {
      wx.showToast({ title: '云同步已开启', icon: 'success' });
    } else {
      wx.showToast({ title: '云同步已关闭', icon: 'none' });
    }
  },

  // 切换账本管理显示
  toggleAccountManage() {
    this.setData({ showAccountManage: !this.data.showAccountManage });
  },

  // 切换导入导出显示
  toggleImportExport() {
    this.setData({ showImportExport: !this.data.showImportExport });
  },

  // 设置主题
  setTheme(e) {
    const themeName = e.currentTarget.dataset.theme;
    storage.updateSettings({ theme: themeName });
    this.setData({ theme: themeName });
    wx.setStorageSync('currentTheme', themeName);

    // 直接设置当前页面的导航栏颜色（同步设置，无动画避免竞争）
    const config = theme.getThemeConfig(themeName);
    this.setNavigationBarColor(config);

    // 刷新其他页面（不包括当前页面，避免重复设置）
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.applyTheme && page !== this) {
        page.applyTheme();
      }
    });

    // 刷新自定义tabBar的主题
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.applyTheme();
    }

    wx.showToast({ title: '主题已切换', icon: 'success' });
  },

  // 设置导航栏颜色
  setNavigationBarColor(config) {
    // 根据背景色判断前景色：深色背景用白色文字，浅色背景用黑色文字
    const frontColor = this.isDarkColor(config.navBg) ? '#ffffff' : '#000000';
    wx.setNavigationBarColor({
      frontColor: frontColor,
      backgroundColor: config.navBg,
      animation: { duration: 0 }
    });
  },

  // 判断颜色是否为深色
  isDarkColor(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // 使用亮度公式
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  },

  // 删除账本
  deleteAccount(e) {
    const accountId = e.currentTarget.dataset.id;
    const accounts = this.data.accounts;
    const account = accounts.find(a => a.id === accountId);

    if (!account) return;

    if (accounts.length <= 1) {
      wx.showToast({ title: '至少保留一个账本', icon: 'none' });
      return;
    }

    // 获取该账本的账单数量
    const bills = storage.getBillsByAccount(accountId);
    const billCount = bills.length;

    this.setData({
      showDeleteAccountModal: true,
      deleteAccountTarget: { id: accountId, name: account.name, billCount }
    });
  },

  // 直接删除账本
  directDeleteAccount() {
    const { deleteAccountTarget } = this.data;
    storage.deleteAccount(deleteAccountTarget.id);
    this.closeDeleteAccountModal();
    this.loadData();
    wx.showToast({ title: '已删除', icon: 'success' });
  },

  // 显示迁移选项
  showMigrateAccountOptions() {
    const { deleteAccountTarget, accounts } = this.data;
    // 过滤掉要删除的账本本身
    const options = accounts.filter(a => a.id !== deleteAccountTarget.id);
    this.setData({
      showDeleteAccountModal: false,
      showMigrateAccountModal: true,
      migrateAccountOptions: options,
      selectedMigrateAccountId: ''
    });
  },

  // 选择迁移目标
  selectMigrateAccount(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ selectedMigrateAccountId: id });
  },

  // 确认迁移并删除
  confirmMigrateAndDeleteAccount() {
    const { deleteAccountTarget, selectedMigrateAccountId } = this.data;

    if (!selectedMigrateAccountId) {
      wx.showToast({ title: '请选择目标账本', icon: 'none' });
      return;
    }

    // 先迁移账单到新账本（会同步到云端）
    storage.updateBillsAccount(deleteAccountTarget.id, selectedMigrateAccountId);
    // 删除账本，但不删除云端账单（账单已迁移到新账本）
    storage.deleteAccount(deleteAccountTarget.id, false);

    this.closeMigrateAccountModal();
    this.loadData();
    wx.showToast({ title: '已迁移并删除', icon: 'success' });
  },

  // 关闭删除模态框
  closeDeleteAccountModal() {
    this.setData({
      showDeleteAccountModal: false,
      deleteAccountTarget: {}
    });
  },

  // 关闭迁移模态框
  closeMigrateAccountModal() {
    this.setData({
      showMigrateAccountModal: false,
      migrateAccountOptions: [],
      selectedMigrateAccountId: ''
    });
  },

  // 开始添加账本（显示内联输入框）
  startAddAccount() {
    this.setData({
      showAddAccountInline: true,
      newAccountName: ''
    });
  },

  // 取消添加账本
  cancelAddAccount() {
    this.setData({
      showAddAccountInline: false,
      newAccountName: ''
    });
  },

  // 账本名称输入
  onNewAccountNameInput(e) {
    let value = e.detail.value;

    // 判断是否包含汉字
    const hasChinese = /[\u4e00-\u9fa5]/.test(value);

    if (hasChinese) {
      // 包含汉字，限制最多8个汉字
      let chineseCount = 0;
      value = value.replace(/[\u4e00-\u9fa5]/g, (char) => {
        if (chineseCount < 8) {
          chineseCount++;
          return char;
        }
        return ''; // 超过8个汉字的部分移除
      });
    }
    // 如果是纯字母/数字（拼音），不限制长度，用户可以完整输入

    this.setData({ newAccountName: value });
  },

  // 确认添加账本
  confirmAddAccount() {
    const { newAccountName } = this.data;
    const name = newAccountName.trim().slice(0, 8);
    if (!name) {
      wx.showToast({ title: '请输入账本名称', icon: 'none' });
      return;
    }

    const account = storage.createAccount(name);
    if (account.error) {
      wx.showToast({ title: account.error, icon: 'none' });
      return;
    }

    storage.setCurrentAccount(account.id);

    this.setData({
      showAddAccountInline: false,
      newAccountName: ''
    });

    this.loadData();

    // 刷新其他页面的账本列表
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.loadAccounts && page !== this) {
        page.loadAccounts();
      }
    });
    wx.showToast({ title: '账本已创建', icon: 'success' });
  },

  // 点击编辑按钮开始编辑
  startEditAccountName(e) {
    const accountId = e.currentTarget.dataset.id;
    const accountName = e.currentTarget.dataset.name;
    this.setData({
      editingAccountId: accountId,
      editingAccountName: accountName
    });
  },

  // 编辑账本名称输入
  onEditAccountNameInput(e) {
    let value = e.detail.value;

    // 判断是否包含汉字
    const hasChinese = /[\u4e00-\u9fa5]/.test(value);

    if (hasChinese) {
      // 包含汉字，限制最多8个汉字
      let chineseCount = 0;
      value = value.replace(/[\u4e00-\u9fa5]/g, (char) => {
        if (chineseCount < 8) {
          chineseCount++;
          return char;
        }
        return ''; // 超过8个汉字的部分移除
      });
    }
    // 如果是纯字母/数字（拼音），不限制长度，用户可以完整输入

    this.setData({ editingAccountName: value });
  },

  // 确认修改账本名称（按键盘完成时触发）
  confirmEditAccountName() {
    this.saveAccountName();
  },

  // 保存账本名称
  saveAccountName() {
    const { editingAccountId, editingAccountName } = this.data;
    if (!editingAccountId) return;

    const newName = editingAccountName.trim().slice(0, 8);
    if (!newName) {
      this.setData({
        editingAccountId: '',
        editingAccountName: ''
      });
      return;
    }

    const result = storage.updateAccountName(editingAccountId, newName);
    if (result && result.error) {
      wx.showToast({ title: result.error, icon: 'none' });
      return;
    }

    this.setData({
      editingAccountId: '',
      editingAccountName: ''
    });

    this.loadData();
    wx.showToast({ title: '已修改', icon: 'success' });
  },

  // 点击空白区域保存
  onPageTap() {
    if (this.data.editingAccountId) {
      this.saveAccountName();
    }
  },

  // 切换当前账本（如果正在编辑则先保存）
  switchAccount(e) {
    if (this.data.editingAccountId) {
      this.saveAccountName();
      // 延迟执行切换，等保存完成
      setTimeout(() => {
        const accountId = e.currentTarget.dataset.id;
        storage.setCurrentAccount(accountId);
        this.setData({ currentAccountId: accountId });
        wx.showToast({ title: '已切换账本', icon: 'success' });
      }, 150);
      return;
    }
    const accountId = e.currentTarget.dataset.id;
    storage.setCurrentAccount(accountId);
    this.setData({ currentAccountId: accountId });
    wx.showToast({ title: '已切换账本', icon: 'success' });
  },

  // 导出数据
  exportData() {
    const now = new Date();
    const startDate = `${now.getFullYear()}-01-01`;
    const endDate = `${now.getFullYear()}-12-31`;

    // 获取所有账本ID，默认全选
    const accounts = storage.getAccounts();
    const allAccountIds = accounts.map(function(a) { return a.id; });

    // 生成账本选中状态映射
    var checkedMap = {};
    for (var i = 0; i < accounts.length; i++) {
      checkedMap[accounts[i].id] = true;
    }

    this.setData({
      showExportModal: true,
      dateRangeIndex: 0,
      customStartDate: startDate,
      customEndDate: endDate,
      selectedExportAccounts: allAccountIds,
      accountCheckedMap: checkedMap
    });
  },

  // 隐藏导出弹窗
  hideExportModal() {
    this.setData({ showExportModal: false });
  },

  // 时间范围选择
  onDateRangeChange(e) {
    const index = parseInt(e.detail.value);
    let customStartDate, customEndDate;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (index) {
      case 0: // 本月
        customStartDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        customEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        break;
      case 1: // 上月
        const lastMonth = new Date(year, month, 0);
        customStartDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
        customEndDate = lastMonth.toISOString().split('T')[0];
        break;
      case 2: // 本年
        customStartDate = `${year}-01-01`;
        customEndDate = `${year}-12-31`;
        break;
      case 3: // 上年
        customStartDate = `${year - 1}-01-01`;
        customEndDate = `${year - 1}-12-31`;
        break;
      case 4: // 自定义
        // 保持原值
        break;
    }

    this.setData({
      dateRangeIndex: index,
      customStartDate: customStartDate || this.data.customStartDate,
      customEndDate: customEndDate || this.data.customEndDate
    });
  },

  // 自定义开始日期
  onCustomStartChange(e) {
    this.setData({ customStartDate: e.detail.value });
  },

  // 自定义结束日期
  onCustomEndChange(e) {
    this.setData({ customEndDate: e.detail.value });
  },

  // 账本选择变化
  onAccountSelectChange(e) {
    var selectedIds = e.detail.value;
    var checkedMap = {};
    for (var i = 0; i < selectedIds.length; i++) {
      checkedMap[selectedIds[i]] = true;
    }
    this.setData({
      selectedExportAccounts: selectedIds,
      accountCheckedMap: checkedMap
    });
  },

  // 确认导出
  confirmExport() {
    const { dateRangeIndex, customStartDate, customEndDate, selectedExportAccounts } = this.data;

    let startTime, endTime;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (dateRangeIndex) {
      case 0: // 本月
        startTime = new Date(year, month, 1).getTime();
        endTime = new Date(year, month + 1, 0, 23, 59, 59).getTime();
        break;
      case 1: // 上月
        const lastMonth = new Date(year, month, 0);
        startTime = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).getTime();
        endTime = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59).getTime();
        break;
      case 2: // 本年
        startTime = new Date(year, 0, 1).getTime();
        endTime = new Date(year, 11, 31, 23, 59, 59).getTime();
        break;
      case 3: // 上年
        startTime = new Date(year - 1, 0, 1).getTime();
        endTime = new Date(year - 1, 11, 31, 23, 59, 59).getTime();
        break;
      case 4: // 自定义
        startTime = new Date(customStartDate).getTime();
        // 结束日期设为当天的00:00:00，保证月份计算准确
        endTime = new Date(customEndDate).getTime();
        break;
    }

    if (selectedExportAccounts.length === 0) {
      wx.showToast({ title: '请选择至少一个账本', icon: 'none' });
      return;
    }

    // 使用excel模块导出xls文件
    const result = excel.exportToXLS(selectedExportAccounts, startTime, endTime);

    // 保存并分享xls文件
    this.saveAndShareXLS(result.content, result.filename);

    this.setData({ showExportModal: false });
  },

  // 保存并分享xls文件
  saveAndShareXLS(content, filename) {
    const fileManager = wx.getFileSystemManager();
    const filePath = wx.env.USER_DATA_PATH + '/' + filename;

    fileManager.writeFile({
      filePath: filePath,
      data: content,
      encoding: 'utf8',
      success: () => {
        // 打开文档并显示分享菜单
        wx.openDocument({
          filePath: filePath,
          fileType: 'xls',
          showMenu: true,
          success: () => {
            wx.showToast({ title: '已打开，点击右上角发送给朋友', icon: 'none', duration: 3000 });
          },
          fail: () => {
            wx.showToast({ title: '导出成功，请点击右上角分享', icon: 'none', duration: 3000 });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' });
      }
    });
  },

  // 下载模板
  downloadTemplate() {
    const template = excel.generateImportTemplate();
    this.saveAndShareXLS(template.content, template.filename);
  },

  // 导入数据
  importData() {
    wx.showModal({
      title: '导入账单',
      content: '请先下载模板，按模板格式填写后导入。支持csv格式文件。',
      confirmText: '选择文件',
      success: (res) => {
        if (res.confirm) {
          this.doImport();
        }
      }
    });
  },

  // 执行导入
  doImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'xls', 'xlsx'],
      success: (res) => {
        const filePath = res.tempFiles[0].path;
        const isCSV = filePath.toLowerCase().endsWith('.csv');
        const fileManager = wx.getFileSystemManager();

        // 读取文件
        fileManager.readFile({
          filePath: filePath,
          success: (res) => {
            const uint8Array = new Uint8Array(res.data);
            let content = '';
            let encoding = 'utf-8';

            // 尝试TextDecoder解码
            try {
              if (typeof TextDecoder !== 'undefined') {
                const decoder = new TextDecoder('utf-8');
                content = decoder.decode(uint8Array);
              } else {
                // 低版本基础库，使用默认读取
                content = new TextDecoder().decode(uint8Array);
              }
            } catch (e) {
              wx.showToast({ title: '文件读取失败', icon: 'none' });
              return;
            }

            // 检查标题是否有效
            if (isCSV && !content.includes('日期')) {
              wx.showModal({
                title: '请使用UTF-8编码',
                content: '您的CSV文件不是UTF-8编码，请另存为UTF-8后重试。\n\nExcel：文件 → 另存为 → CSV UTF-8',
                showCancel: false
              });
              return;
            }

            // 解析文件
            let excelData;
            if (isCSV) {
              excelData = excel.parseCSV(content);
            } else {
              excelData = this.parseHTMLTable(content);
            }

            this.doImportProcess(excelData);
          },
          fail: () => {
            wx.showToast({ title: '文件读取失败', icon: 'none' });
          }
        });
      }
    });
  },

  // 执行导入处理
  doImportProcess(excelData) {
    const result = excel.importBills(excelData);

    if (result.success) {
      wx.showToast({
        title: `成功导入${result.added}条数据`,
        icon: 'success',
        duration: 3000
      });
      this.loadData();
      const pages = getCurrentPages();
      const detailPage = pages.find(p => p.route && p.route.includes('detail'));
      if (detailPage && detailPage.loadBills) {
        detailPage.loadBills();
      }
    } else if (result.errorRows && result.errorRows.length > 0) {
      this.showErrorReport(excelData, result.errorRows);
    } else {
      wx.showToast({
        title: result.error || '导入失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 显示错误报告
  showErrorReport(originalData, errorRows) {
    const errorReport = excel.generateErrorReport(originalData, errorRows);
    this.saveAndShareXLS(errorReport.content, errorReport.filename);
  },

  // 保存并分享文件
  saveAndShareXLS(content, filename) {
    const fileManager = wx.getFileSystemManager();
    const filePath = wx.env.USER_DATA_PATH + '/' + filename;

    fileManager.writeFile({
      filePath: filePath,
      data: content,
      encoding: 'utf8',
      success: () => {
        wx.openDocument({
          filePath: filePath,
          fileType: 'xls',
          showMenu: true,
          success: () => {
            wx.showToast({ title: '已打开，点击右上角发送给朋友', icon: 'none', duration: 3000 });
          },
          fail: () => {
            wx.showToast({ title: '导出成功，请点击右上角分享', icon: 'none', duration: 3000 });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' });
      }
    });
  },

  // 打开操作手册
  openGuide() {
    wx.navigateTo({
      url: '/pages/guide/guide'
    });
  }
});