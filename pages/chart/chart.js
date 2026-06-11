// pages/chart/chart.js
const storage = require('../../utils/storage.js');

// 颜色配置
const COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'
];

Page({
  data: {
    theme: 'simple',
    // 账本选择
    accounts: [],
    currentAccountIds: [],
    currentAccountNames: '全部账本',
    showAccountPicker: false,
    showCharts: true,
    // 收支类型
    filterType: 'expense', // 'expense' 支出, 'income' 收入
    // 年月选择
    selectedYear: '',
    selectedMonth: '',
    selectedYearIndex: 0,
    selectedMonthIndex: 0,
    yearList: [],
    monthList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    displayMonthList: [],
    yearMonthMap: {},
    showDatePicker: false,
    // 统计数据
    totalAmount: 0, // 当前页面显示的总支出或总收入
    avgAmount: 0,   // 平均值
    billCount: 0,   // 笔数
    dailyData: [],  // 每日数据（柱状图）
    categoryData: [], // 分类数据（饼图）
    // 是否选择的是年（而非年月）
    isYearOnly: false,
    // 当前显示
    currentTouchPie: 'expense',
    // 柱状图数据
    barChartWidth: 280,
    barItems: []
  },

  onLoad() {
    // 启用分享菜单
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });

    this.initYearMonthList();
  },

  onShareAppMessage() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      path: '/pages/chart/chart',
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

    this.loadAccounts();
    this.applyTheme();
    // 每次显示时刷新年月列表，确保包含新添加的账单年月
    this.initYearMonthList();

    // 更新自定义 tabBar 的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        currentIndex: 1  // 图表页是第 1 个
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
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  },

  // 初始化年份和月份列表 - 从账单中动态获取
  initYearMonthList() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 保存当前选中的年月（如果有的话）
    const prevSelectedYear = this.data.selectedYear;
    const prevSelectedMonth = this.data.selectedMonth;

    // 获取所有账单
    const allBills = storage.getBills();

    // 提取所有有账单的年月
    const yearMonthMap = {}; // { year: Set(month1, month2, ...) }
    allBills.forEach(bill => {
      const date = new Date(bill.date);
      const year = String(date.getFullYear());
      const month = date.getMonth() + 1;
      if (!yearMonthMap[year]) {
        yearMonthMap[year] = new Set();
      }
      yearMonthMap[year].add(month);
    });

    // 确保当前年月一定在列表中（即使没有账单）
    if (!yearMonthMap[currentYear]) {
      yearMonthMap[currentYear] = new Set();
    }
    yearMonthMap[currentYear].add(currentMonth);

    // 获取年份列表（升序）
    const years = Object.keys(yearMonthMap).sort((a, b) => a - b);

    // 获取指定年份的可用月份
    const getAvailableMonths = (year) => {
      const months = yearMonthMap[year];
      if (!months) return [currentMonth];
      return Array.from(months).sort((a, b) => a - b);
    };

    // 确定最终选中的年月：优先使用之前选中的，否则用当前年月
    let selectedYear = currentYear;
    let selectedMonth = currentMonth;

    // 如果之前有选中，且该年在列表中，则使用之前的选中
    if (prevSelectedYear && years.includes(String(prevSelectedYear))) {
      selectedYear = prevSelectedYear;
      const availableMonths = getAvailableMonths(String(selectedYear));
      // 如果之前选中的月份在可用月份中，则使用之前的月份
      if (prevSelectedMonth && availableMonths.includes(prevSelectedMonth)) {
        selectedMonth = prevSelectedMonth;
      } else {
        selectedMonth = availableMonths[0];
      }
    }

    // 获取选中年份的可用月份
    const selectedYearStr = String(selectedYear);
    const availableMonths = getAvailableMonths(selectedYearStr);
    const selectedYearIndex = years.indexOf(selectedYearStr);
    const selectedMonthIndex = availableMonths.indexOf(selectedMonth);

    this.setData({
      yearList: years,
      yearMonthMap: yearMonthMap,
      displayMonthList: availableMonths,
      selectedYear: selectedYear,
      selectedMonth: selectedMonth,
      selectedYearIndex: selectedYearIndex >= 0 ? selectedYearIndex : 0,
      selectedMonthIndex: selectedMonthIndex >= 0 ? selectedMonthIndex : 0,
      isYearOnly: this.data.isYearOnly || false,
      showDatePicker: false
    });

    // 加载数据
    this.loadBills();
  },

  // 加载账本列表
  loadAccounts() {
    const accounts = storage.getAccounts();
    const currentAccountId = storage.getCurrentAccountId();
    let savedAccountIds = storage.getCurrentAccountIds();

    // 如果有保存的账本选择（可以是空数组表示全选），使用保存的选择
    // 否则使用当前设置的账本
    let selectedAccounts = savedAccountIds;

    // 只有当 savedAccountIds 为 null 时，才使用 currentAccountId
    if (selectedAccounts === null) {
      if (currentAccountId) {
        selectedAccounts = [currentAccountId];
      } else {
        selectedAccounts = [];
      }
    } else if (selectedAccounts.length > 0) {
      // 过滤掉已删除的账本
      selectedAccounts = selectedAccounts.filter(id => accounts.some(a => a.id === id));
      // 如果过滤后为空，使用当前账本
      if (selectedAccounts.length === 0 && currentAccountId) {
        selectedAccounts = [currentAccountId];
      }
    }

    // 获取选中的账本名称
    let names = [];
    if (selectedAccounts.length === 0) {
      // 空数组表示全选
      names = ['全部账本'];
    } else {
      names = accounts.filter(a => selectedAccounts.includes(a.id)).map(a => a.name);
      if (names.length === 0 || names.length === accounts.length) {
        names = ['全部账本'];
      }
    }

    this.setData({
      accounts,
      currentAccountIds: selectedAccounts,
      currentAccountNames: names.length > 0 ? names.join(', ') : '全部账本'
    });
  },

  // 显示账本选择器
  showAccountPicker() {
    const { accounts, currentAccountIds } = this.data;
    const isAllSelected = currentAccountIds.length === 0 || (currentAccountIds.length > 0 && currentAccountIds.length === accounts.length && accounts.every(a => currentAccountIds.includes(a.id)));

    const accountsWithAll = accounts.map(a => ({
      id: a.id,
      name: a.name,
      checked: isAllSelected || currentAccountIds.includes(a.id)
    }));

    // 全选选项
    const allOption = { id: '', name: '全选', checked: isAllSelected };
    const newAccountsWithAll = [allOption];
    for (let i = 0; i < accountsWithAll.length; i++) {
      newAccountsWithAll.push(accountsWithAll[i]);
    }

    this.setData({
      showAccountPicker: true,
      showCharts: false,
      accountError: false,
      accountsWithAll: newAccountsWithAll
    });
  },

  // 隐藏账本选择器
  hideAccountPicker() {
    this.setData({ showAccountPicker: false, showCharts: true });
    this.loadBills();
  },

  // 切换账本选择
  toggleAccount(e) {
    const accountId = e.currentTarget.dataset.id;
    let { currentAccountIds, accounts } = this.data;
    const allAccountIds = accounts.map(a => a.id);

    // 如果是"全选"
    if (accountId === '') {
      // 获取当前全选的状态
      const isAllSelected = this.data.accountsWithAll[0].checked;

      if (isAllSelected) {
        // 当前是全选状态，点击则取消全选（所有账本都不选）
        currentAccountIds = [];
      } else {
        // 当前不是全选状态，点击则选中所有账本
        currentAccountIds = allAccountIds.slice();
      }
    } else {
      // 点击其他账本
      // 切换当前账本的选择状态
      const index = currentAccountIds.indexOf(accountId);
      if (index > -1) {
        currentAccountIds.splice(index, 1);
      } else {
        currentAccountIds.push(accountId);
      }
    }

    // 判断是否全选（所有账本都被选中）
    const isAllSelected = currentAccountIds.length === allAccountIds.length && allAccountIds.length > 0;

    // 获取选中的账本名称
    let names = [];
    if (isAllSelected || currentAccountIds.length === 0) {
      names = ['全部账本'];
    } else {
      names = accounts.filter(a => currentAccountIds.includes(a.id)).map(a => a.name);
    }

    // 更新选中状态
    const accountsWithAll = this.data.accountsWithAll.map(a => {
      if (a.id === '') {
        return { ...a, checked: isAllSelected };
      } else {
        return { ...a, checked: isAllSelected || currentAccountIds.includes(a.id) };
      }
    });

    // 保存时：全选用空数组表示，其他用具体IDs
    const saveIds = isAllSelected ? [] : currentAccountIds;

    this.setData({
      currentAccountIds: saveIds,
      currentAccountNames: names.length > 0 ? names.join(', ') : '全部账本',
      accountsWithAll,
      accountError: false
    });
  },

  // 确认账本选择
  confirmAccount() {
    const { currentAccountIds, accounts } = this.data;

    // 空数组表示全选，有账本的情况下不报错
    if (currentAccountIds.length === 0) {
      // 全选，不需要报错
    } else if (currentAccountIds.length > 0) {
      // 有选中具体账本
    }

    // 保存选中的账本ID（全选时保存空数组）
    storage.setCurrentAccountIds(currentAccountIds);
    this.setData({ showAccountPicker: false, showCharts: true, accountError: false });
    this.loadBills();
  },

  // 切换收支类型
  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ filterType: type });
    this.loadBills();
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ showDatePicker: true, showCharts: false });
  },

  // 隐藏日期选择器
  hideDatePicker() {
    this.setData({ showDatePicker: false, showCharts: true });
  },

  // 选择年份
  selectYear(e) {
    const index = e.currentTarget.dataset.index;
    const year = e.currentTarget.dataset.year;
    const { yearMonthMap } = this.data;

    // 获取该年份的可用月份
    const months = yearMonthMap[year];
    const availableMonths = months ? Array.from(months).sort((a, b) => a - b) : [];

    // 更新年份选择，同时更新月份列表
    this.setData({
      selectedYearIndex: index,
      selectedYear: year,
      displayMonthList: availableMonths,
      selectedMonth: availableMonths.length > 0 ? availableMonths[0] : '',
      selectedMonthIndex: 0,
      showCharts: true,
      isYearOnly: false
    });
  },

  // 选择只按年查询
  selectYearOnly() {
    const { selectedYear, selectedYearIndex } = this.data;
    if (!selectedYear) return;

    this.setData({
      isYearOnly: true,
      showDatePicker: false,
      showCharts: true
    });

    this.loadBills();
  },

  // 选择月份
  selectMonth(e) {
    const month = e.currentTarget.dataset.month;

    this.setData({
      selectedMonth: month,
      selectedMonthIndex: this.data.displayMonthList.indexOf(month),
      showDatePicker: false,
      showCharts: true,
      isYearOnly: false
    });

    this.loadBills();
  },

  // 加载账单数据并统计
  loadBills() {
    const { selectedYear, selectedMonth, filterType, currentAccountIds, isYearOnly } = this.data;

    let startTime, endTime;

    if (isYearOnly) {
      // 只选择年份，显示全年数据
      startTime = new Date(selectedYear, 0, 1).getTime();
      endTime = new Date(selectedYear, 11, 31, 23, 59, 59).getTime();
    } else {
      // 选择了年月
      startTime = new Date(selectedYear, selectedMonth - 1, 1).getTime();
      endTime = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).getTime();
    }

    const bills = storage.getBillsByDateRange(currentAccountIds, startTime, endTime);

    // 过滤收支类型
    const filteredBills = bills.filter(b => b.type === filterType);

    // 统计总金额和笔数
    let totalAmount = 0;
    filteredBills.forEach(bill => {
      totalAmount += parseFloat(bill.amount);
    });
    const billCount = filteredBills.length;
    const avgAmount = billCount > 0 ? totalAmount / billCount : 0;

    // 按日期统计（用于柱状图）
    const dailyMap = {};
    filteredBills.forEach(bill => {
      const date = new Date(bill.date);
      const day = date.getDate();
      if (!dailyMap[day]) {
        dailyMap[day] = 0;
      }
      dailyMap[day] += parseFloat(bill.amount);
    });

    // 如果是按年显示，则按月统计
    let chartData = [];
    if (isYearOnly) {
      const monthlyMap = {};
      filteredBills.forEach(bill => {
        const date = new Date(bill.date);
        const month = date.getMonth() + 1;
        if (!monthlyMap[month]) {
          monthlyMap[month] = 0;
        }
        monthlyMap[month] += parseFloat(bill.amount);
      });
      chartData = Object.keys(monthlyMap).map(day => ({
        day: parseInt(day),
        amount: monthlyMap[day]
      })).sort((a, b) => a.day - b.day);
    } else {
      // 按日统计
      chartData = Object.keys(dailyMap).map(day => ({
        day: parseInt(day),
        amount: dailyMap[day]
      })).sort((a, b) => a.day - b.day);
    }

    // 按类别统计（用于横向条形图）
    const categoryMap = {};
    filteredBills.forEach(bill => {
      const categories = storage.getCategories();
      const category = categories[filterType].find(c => c.id === bill.categoryId);
      const categoryId = bill.categoryId;
      const name = category ? category.name : '其他';
      const amount = parseFloat(bill.amount);

      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = { name, amount: 0 };
      }
      categoryMap[categoryId].amount += amount;
    });

    const total = Object.values(categoryMap).reduce((sum, val) => sum + val.amount, 0);
    const categoryData = Object.keys(categoryMap).map((categoryId, index) => {
      const item = categoryMap[categoryId];
      const val = item.amount;
      // 有小数则显示2位，否则显示整数
      const displayValue = val % 1 === 0 ? val.toString() : val.toFixed(2);
      return {
        categoryId,
        name: item.name,
        value: displayValue,
        percentage: total > 0 ? ((val / total) * 100).toFixed(1) : 0,
        color: COLORS[index % COLORS.length]
      };
    }).sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

    // 有小数则显示2位，否则显示整数
    const displayTotal = totalAmount % 1 === 0 ? totalAmount.toString() : totalAmount.toFixed(2);
    const displayAvg = avgAmount % 1 === 0 ? avgAmount.toString() : avgAmount.toFixed(2);

    // 计算柱状图数据
    let maxValue = 100;
    chartData.forEach(item => {
      if (item.amount > maxValue) maxValue = item.amount;
    });

    // 动态计算柱状图宽度
    const minBarWidth = 35;
    const barSpacing = 8;
    const padding = 15;
    const baseWidth = 280;
    const neededWidth = chartData.length * (minBarWidth + barSpacing) + padding * 2;
    const barChartWidth = Math.max(baseWidth, neededWidth);

    // 生成柱状图每个柱子的渲染数据
    const barItems = chartData.map((item, index) => {
      const heightPercent = (item.amount / maxValue) * 100;
      // 有小数则显示2位，否则显示整数
      const displayAmount = item.amount % 1 === 0 ? item.amount.toString() : item.amount.toFixed(2);
      return {
        day: item.day,
        amount: displayAmount,
        height: heightPercent,
        label: this.data.isYearOnly ? `${item.day}月` : `${item.day}日`
      };
    });

    this.setData({
      totalAmount: displayTotal,
      avgAmount: displayAvg,
      billCount: billCount,
      dailyData: chartData,
      categoryData: categoryData,
      barChartWidth: barChartWidth,
      barItems: barItems
    });

    // 绘制饼图
    setTimeout(() => {
      this.drawPieChart();
    }, 100);
  },

  // 绘制饼图
  drawPieChart() {
    const { categoryData } = this.data;

    const ctx = wx.createCanvasContext('categoryPieChart', this);

    if (categoryData.length === 0) {
      // 清空画布，大小改为1.5倍
      ctx.clearRect(0, 0, 150, 150);
      ctx.draw();
      return;
    }

    // 放大1.5倍：100 -> 150
    const width = 150;
    const height = 150;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // 计算总数
    const total = categoryData.reduce((sum, item) => sum + parseFloat(item.value), 0);

    // 绘制扇形 - 从12点钟方向开始（-90度）
    let startAngle = -Math.PI / 2;
    categoryData.forEach(item => {
      const value = parseFloat(item.value);
      const sweepAngle = total > 0 ? (value / total) * 2 * Math.PI : 0;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sweepAngle);
      ctx.closePath();
      ctx.setFillStyle(item.color);
      ctx.fill();

      startAngle += sweepAngle;
    });

    // 绘制内圆（环形效果）
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.setFillStyle('#ffffff');
    ctx.fill();

    ctx.draw(false);
  },

  // 饼图触摸事件
  touchPieChart(e) {
    // 可以添加点击显示详情功能
  },

  // 点击柱状图某一天，跳转到明细页面
  onBarClick(e) {
    const day = e.currentTarget.dataset.day;
    const { selectedYear, selectedMonth, isYearOnly } = this.data;

    // 设置跳转参数（使用 chartFilterInfo 区分来源）
    // 整年视图（isYearOnly=true）时：柱状图显示每月汇总，点击是月份，day为空
    // 按月视图（isYearOnly=false）时：柱状图显示每日数据，点击是日期
    const info = {
      type: 'bar', // 标记来源是日期点击
      year: selectedYear,
      month: isYearOnly ? day : selectedMonth,  // 整年视图时，day实际是月份
      day: isYearOnly ? '' : day,  // 整年视图时不传具体日期
      filterType: this.data.filterType,
      categoryId: '',  // 日期点击不带分类
      categoryName: '' // 日期点击不带分类
    };
    wx.setStorageSync('chartFilterInfo', info);

    // 跳转到明细页面
    wx.switchTab({
      url: '/pages/detail/detail'
    });
  },

  // 点击分类横向条形图，跳转到明细页面
  onCategoryClick(e) {
    const categoryName = e.currentTarget.dataset.category;
    const { selectedYear, selectedMonth, filterType, categoryData, isYearOnly } = this.data;

    // 找到对应的分类ID
    const categoryInfo = categoryData.find(c => c.name === categoryName);
    let categoryId = '';
    if (categoryInfo && categoryInfo.categoryId) {
      categoryId = categoryInfo.categoryId;
    }

    // 设置跳转参数（使用 chartFilterInfo 区分来源）
    const info = {
      type: 'category', // 标记来源是分类点击
      year: selectedYear,
      month: isYearOnly ? null : selectedMonth,
      isYearOnly: isYearOnly,
      day: '',  // 分类点击不带日期
      filterType: filterType,
      categoryId: categoryId,
      categoryName: categoryName
    };
    wx.setStorageSync('chartFilterInfo', info);

    // 跳转到明细页面
    wx.switchTab({
      url: '/pages/detail/detail'
    });
  }
});