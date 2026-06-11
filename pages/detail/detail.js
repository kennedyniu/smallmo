// pages/detail/detail.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    theme: 'simple',
    bills: [],
    accounts: [],
    currentAccountIds: [],
    currentAccountNames: '全部账本',
    selectedYear: '',
    selectedMonth: '',
    selectedYearIndex: 0,
    selectedMonthIndex: 0,
    yearList: [],
    monthList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    displayMonthList: [],
    yearMonthMap: {},
    showAccountPicker: false,
    showDatePicker: false,
    totalExpense: 0,
    totalIncome: 0,
    startTime: 0,
    endTime: 0,
    filterType: '', // 筛选类型：'' 全部, 'expense' 支出, 'income' 收入
    // 分类筛选（从图表页面跳转时使用）
    filterCategoryId: '',
    filterCategoryName: '',
    isYearOnly: false,
    // 左滑删除相关
    touchStartX: 0,
    slidingBillId: null,
    // 搜索相关
    showSearchPanel: false,
    searchKeyword: '',
    searchStartDate: '',
    searchEndDate: '',
    isSearching: false
  },

  onLoad() {
    const settings = wx.getStorageSync('settings') || {};
    const defaultTab = settings.defaultTab;
  
    if (defaultTab && defaultTab !== 'detail') {
      const tabMap = {
        chart: '/pages/chart/chart',
        add: '/pages/add/add',
        mine: '/pages/mine/mine'
      };
      wx.switchTab({ url: tabMap[defaultTab] });
    }
  },
  onLoad() {
    const settings = wx.getStorageSync('settings') || {};
    const defaultTab = settings.defaultTab;
  
    if (defaultTab && defaultTab !== 'detail') {
      const tabMap = {
        chart: '/pages/chart/chart',
        add: '/pages/add/add',
        mine: '/pages/mine/mine'
      };
      wx.switchTab({ url: tabMap[defaultTab] });
    }
  },

  onShareAppMessage() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      path: '/pages/detail/detail',
      imageUrl: '/images/share.png'
    };
  },

  onShareTimeline() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      imageUrl: '/images/share.png'
    };
  },

  // 进入页面时，清除之前从图表带来的筛选条件（重新开始）
  applyFilterInfo() {
    // 优先读取 chartFilterInfo（从图表跳转）
    // 优先读取 chartFilterInfo（从图表跳转）
    let filterInfo = wx.getStorageSync('chartFilterInfo');
    if (filterInfo) {
      // 清除保存的信息，避免重复使用
      wx.setStorageSync('chartFilterInfo', null);
    } else {
      // 其次读取 lastBillInfo（从记账页面跳转）
      filterInfo = storage.getLastBillInfo();
      if (filterInfo) {
        storage.setLastBillInfo(null);
      }
    }

    if (!filterInfo) {
      return;
    }

    const { type, year, month, day, accountId, categoryId, categoryName, filterType, isYearOnly } = filterInfo;

    const { yearList, yearMonthMap } = this.data;

    // 根据 isYearOnly 设置明细页面的显示模式
    if (isYearOnly) {
      this.setData({ isYearOnly: true });
      // 设置全年日期范围
      const startTime = new Date(year, 0, 1).getTime();
      const endTime = new Date(year, 11, 31, 23, 59, 59).getTime();
      this.setData({ startTime, endTime });
    }

    // 根据 type 类型决定应用哪种筛选条件
    // type === 'bar': 点击柱状图，应用日期筛选
    // type === 'category': 点击分类，应用分类筛选
    if (type === 'category') {
      // 点击分类，只应用分类筛选
      if (categoryId || categoryName) {
        this.setData({
          filterCategoryId: categoryId || '',
          filterCategoryName: categoryName || ''
        });
      }
    } else if (type === 'bar') {
      // 点击日期柱状图，不应用分类筛选（清除可能残留的分类筛选）
      this.setData({
        filterCategoryId: '',
        filterCategoryName: ''
      });
    }

    // 设置收支类型筛选
    if (filterType) {
      this.setData({ filterType: filterType });
    }

    // 检查是否需要更新年月
    const yearStr = String(year);
    if (year && yearList.includes(yearStr)) {
      const yearIndex = yearList.indexOf(yearStr);
      const yearKey = String(year);
      const availableMonths = yearMonthMap[yearKey] ? Array.from(yearMonthMap[yearKey]).sort((a, b) => a - b) : [];

      // 如果是整年模式，不需要设置月份和日期范围（已经在前面设置好了全年范围）
      if (!isYearOnly) {
        // 确定要设置的月份
        let targetMonth = month;
        if (!targetMonth && availableMonths.length > 0) {
          targetMonth = availableMonths[0];
        }

        if (targetMonth && availableMonths.length > 0 && availableMonths.includes(targetMonth)) {
          this.setData({
            selectedYear: year,
            selectedYearIndex: yearIndex,
            selectedMonth: targetMonth,
            selectedMonthIndex: availableMonths.indexOf(targetMonth),
            displayMonthList: availableMonths
          });
          this.setMonthRange(yearIndex, targetMonth);
        } else if (availableMonths.length > 0) {
          // 只设置年，但该年有月份数据
          this.setData({
            selectedYear: year,
            selectedYearIndex: yearIndex,
            selectedMonth: availableMonths[0],
            selectedMonthIndex: 0,
            displayMonthList: availableMonths
          });
          this.setMonthRange(yearIndex, availableMonths[0]);
        }
      }
    }

    // 4. 如果有day参数，设置日期范围
    if (day && year && month) {
      // 使用本地时区，在月份的第一天和最后一天
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const dayInMonth = Math.min(day, lastDay.getDate());
      const startTime = new Date(year, month - 1, dayInMonth, 0, 0, 0).getTime();
      const endTime = new Date(year, month - 1, dayInMonth, 23, 59, 59).getTime();
      this.setData({ startTime, endTime });
    }

    // 5. 自动勾选该账本
    if (accountId) {
      const { accounts } = this.data;
      const updatedAccounts = accounts.map(account => ({
        ...account,
        checked: account.id === accountId
      }));

      const selectedAccount = accounts.find(a => a.id === accountId);
      const accountName = selectedAccount ? selectedAccount.name : '';

      this.setData({
        accounts: updatedAccounts,
        currentAccountIds: [accountId],
        currentAccountNames: accountName
      });

      // 保存账本选择
      storage.setCurrentAccountIds([accountId]);
    }

    // 重新加载账单
    this.loadBills();
  },

  onShow() {
    // 每次显示都从 storage 恢复账本选择
    this.loadAccounts();
    this.applyTheme();
    // 重新初始化年月列表，以防新增了账单的年月
    this.initYearMonthList();

    // 检查是否有从图表带来的筛选参数
    const chartFilterInfo = wx.getStorageSync('chartFilterInfo');
    const lastBillInfo = storage.getLastBillInfo();

    // 检查是否需要清除搜索条件（从其他tab切换过来）
    const shouldClearSearch = wx.getStorageSync('clearDetailSearch');
    wx.setStorageSync('clearDetailSearch', false); // 清除标志位

    // 总是清除搜索条件，因为离开页面时已经清空了
    this.setData({
      filterType: '',
      filterCategoryId: '',
      filterCategoryName: '',
      isYearOnly: false,
      searchKeyword: '',
      searchStartDate: '',
      searchEndDate: '',
      isSearching: false,
      showSearchPanel: false
    });

    // 先应用筛选条件，再加载账单
    this.applyFilterInfo();
    this.loadBills();

    // 更新自定义 tabBar 的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        currentIndex: 0  // 明细页是第 0 个
      });
    }
  },

  onHide() {
    // 离开明细界面时，清除搜索条件
    this.setData({
      showSearchPanel: false,
      searchKeyword: '',
      searchStartDate: '',
      searchEndDate: '',
      isSearching: false
    });
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

    // 确保当前年月一定在列表中
    if (!yearMonthMap[currentYear]) {
      yearMonthMap[currentYear] = new Set();
    }
    yearMonthMap[currentYear].add(currentMonth);

    // 获取年份列表（升序）
    const years = Object.keys(yearMonthMap).sort((a, b) => a - b);

    // 获取当前年份的可用月份
    const getAvailableMonths = (year) => {
      const months = yearMonthMap[year];
      if (!months) return [currentMonth];
      return Array.from(months).sort((a, b) => a - b);
    };

    // 设置默认选中的年月为当前年月
    const currentYearIndex = years.indexOf(String(currentYear));
    const availableMonths = getAvailableMonths(String(currentYear));
    const currentMonthIndex = availableMonths.indexOf(currentMonth);
    const selectedMonth = currentMonthIndex >= 0 ? currentMonth : availableMonths[0];

    this.setData({
      yearList: years,
      yearMonthMap: yearMonthMap,
      displayMonthList: availableMonths,
      selectedYear: currentYear,
      selectedMonth: selectedMonth,
      selectedYearIndex: currentYearIndex >= 0 ? currentYearIndex : 0,
      selectedMonthIndex: availableMonths.indexOf(selectedMonth),
      showDatePicker: false
    });

    // 设置本月时间范围
    const yearIndex = currentYearIndex >= 0 ? currentYearIndex : 0;
    const monthIndex = availableMonths.indexOf(selectedMonth);
    this.setMonthRange(yearIndex, selectedMonth);
  },

  // 设置月份时间范围
  setMonthRange(yearIndex, month) {
    const { yearList } = this.data;
    const year = yearList[yearIndex];

    const startTime = new Date(year, month - 1, 1).getTime();
    const endTime = new Date(year, month, 0, 23, 59, 59).getTime();

    this.setData({
      selectedYear: year,
      selectedMonth: month,
      selectedYearIndex: yearIndex,
      startTime,
      endTime
    });
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

  // 加载账单列表
  loadBills() {
    const { currentAccountIds, startTime, endTime, filterType, filterCategoryId, filterCategoryName, isSearching, searchKeyword, searchStartDate, searchEndDate } = this.data;

    let accountIds = [];
    if (currentAccountIds.length > 0) {
      accountIds = currentAccountIds;
    }

    let bills;

    // 如果处于搜索模式，使用搜索条件
    if (isSearching) {
      // 获取所有账本的所有账单（不受年月限制）
      bills = storage.getBills();

      // 按账本筛选
      if (accountIds.length > 0) {
        bills = bills.filter(bill => accountIds.includes(bill.accountId));
      }

      // 按关键词搜索（类别名称或备注）
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        const categories = storage.getCategories();
        bills = bills.filter(bill => {
          const category = categories[bill.type].find(c => c.id === bill.categoryId);
          const categoryName = category ? category.name.toLowerCase() : '';
          const remark = bill.remark ? bill.remark.toLowerCase() : '';
          return categoryName.includes(keyword) || remark.includes(keyword);
        });
      }

      // 按日期范围搜索
      if (searchStartDate) {
        const startTimestamp = new Date(searchStartDate).getTime();
        bills = bills.filter(bill => bill.date >= startTimestamp);
      }
      if (searchEndDate) {
        const endTimestamp = new Date(searchEndDate).getTime() + 24 * 60 * 60 * 1000 - 1; // 当天23:59:59
        bills = bills.filter(bill => bill.date <= endTimestamp);
      }
    } else {
      // 普通模式，按年月筛选
      bills = storage.getBillsByDateRange(accountIds, startTime, endTime);

      // 按筛选类型过滤（支出/收入）
      if (filterType) {
        bills = bills.filter(bill => bill.type === filterType);
      }

      // 按分类筛选（从图表页面跳转过来时使用）
      if (filterCategoryId) {
        bills = bills.filter(bill => bill.categoryId === filterCategoryId);
      }
    }

    // 先按账单日期降序，再按创建日期降序
    bills.sort((a, b) => {
      const billDateA = a.date;
      const billDateB = b.date;
      const createTimeA = a.createTime || a.date;
      const createTimeB = b.createTime || b.date;

      // 账单日期降序
      if (billDateB !== billDateA) {
        return billDateB - billDateA;
      }
      // 创建日期降序
      return createTimeB - createTimeA;
    });

    // 格式化数据
    const formattedBills = bills.map(bill => {
      const category = storage.getCategories()[bill.type].find(c => c.id === bill.categoryId);
      const date = new Date(bill.date);
      const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      return {
        ...bill,
        categoryName: category ? category.name : '未知',
        categoryIcon: category ? category.icon : '📦',
        formattedDate: storage.formatDate(bill.date, 'MM-DD HH:mm'),
        weekDay: weekDays[date.getDay()],
        dateKey: storage.formatDate(bill.date, 'YYYY-MM-DD'),
        slideOpen: false
      };
    });

    // 按日期分组
    const groupedBills = this.groupBillsByDate(formattedBills);

    // 获取所有账单计算统计（不受筛选影响）
    const allBills = storage.getBillsByDateRange(accountIds, startTime, endTime);
    let totalExpense = 0;
    let totalIncome = 0;
    allBills.forEach(bill => {
      if (bill.type === 'expense') {
        totalExpense += parseFloat(bill.amount);
      } else {
        totalIncome += parseFloat(bill.amount);
      }
    });

    this.setData({
      bills: formattedBills,
      groupedBills: groupedBills,
      totalExpense: totalExpense.toFixed(2),
      totalIncome: totalIncome.toFixed(2)
    });
  },

  // 按日期分组账单并计算每日合计
  groupBillsByDate(bills) {
    const groups = {};

    bills.forEach(bill => {
      const dateKey = bill.dateKey;
      if (!groups[dateKey]) {
        const date = new Date(dateKey);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        groups[dateKey] = {
          date: dateKey,
          displayDate: `${month}月${day}日`,
          weekDay: bill.weekDay,
          totalExpense: 0,
          totalIncome: 0,
          bills: []
        };
      }
      if (bill.type === 'expense') {
        groups[dateKey].totalExpense += parseFloat(bill.amount);
      } else {
        groups[dateKey].totalIncome += parseFloat(bill.amount);
      }
      groups[dateKey].bills.push(bill);
    });

    // 转换为数组
    const result = Object.values(groups);

    // 每组内先按账单日期降序，再按创建日期降序
    result.forEach(item => {
      item.bills.sort((a, b) => {
        if (b.date !== a.date) return b.date - a.date;
        return (b.createTime || b.date) - (a.createTime || a.date);
      });
    });

    // 按日期分组降序排列
    result.sort((a, b) => {
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      return bDate - aDate;
    });

    result.forEach(item => {
      item.totalExpenseNum = item.totalExpense;
      item.totalIncomeNum = item.totalIncome;
      item.totalExpense = item.totalExpense.toFixed(2);
      item.totalIncome = item.totalIncome.toFixed(2);
    });
    return result;
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
      accountError: false,
      accountsWithAll: newAccountsWithAll
    });
  },

  // 隐藏账本选择器
  hideAccountPicker() {
    this.setData({ showAccountPicker: false });
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
    this.setData({
      showAccountPicker: false,
      accountError: false,
      // 清除从图表带来的筛选条件
      filterCategoryId: '',
      filterCategoryName: ''
    });
    this.loadBills();
  },

  // 显示日期选择器 - 更新可用月份
  showDatePicker() {
    // 更新当前选中年份的可用月份
    const { selectedYear, yearMonthMap } = this.data;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    let availableMonths = yearMonthMap[selectedYear];
    if (!availableMonths) {
      availableMonths = new Set();
    }
    availableMonths.add(currentMonth);

    const monthsArray = Array.from(availableMonths).sort((a, b) => a - b);

    this.setData({
      showDatePicker: true,
      displayMonthList: monthsArray
    });
  },

  // 隐藏日期选择器
  hideDatePicker() {
    this.setData({ showDatePicker: false });
  },

  // 选择年份 - 更新可用月份，不关闭选择器
  selectYear(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const year = this.data.yearList[index];

    // 获取该年份的可用月份
    const yearMonthMap = this.data.yearMonthMap;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    let availableMonths = yearMonthMap[year];
    if (!availableMonths) {
      availableMonths = new Set();
    }
    // 确保当前月总是可用
    availableMonths.add(currentMonth);

    const monthsArray = Array.from(availableMonths).sort((a, b) => a - b);

    this.setData({
      selectedYearIndex: index,
      selectedYear: year,
      displayMonthList: monthsArray,
      selectedMonth: monthsArray[0],
      selectedMonthIndex: 0,
      // 清除从图表带来的筛选条件
      filterCategoryId: '',
      filterCategoryName: ''
    });

    this.setMonthRange(index, monthsArray[0]);
    // 切换年月时清除搜索条件
    this.setData({
      searchKeyword: '',
      searchStartDate: '',
      searchEndDate: '',
      isSearching: false
    });
    this.loadBills();
  },

  // 选择月份 - 关闭选择器
  selectMonth(e) {
    const month = parseInt(e.currentTarget.dataset.month);
    const { selectedYearIndex } = this.data;

    this.setMonthRange(selectedYearIndex, month);
    // 切换年月时清除搜索条件
    this.setData({
      selectedMonth: month,
      showDatePicker: false,
      // 清除从图表带来的筛选条件
      filterCategoryId: '',
      filterCategoryName: '',
      // 清除搜索条件
      searchKeyword: '',
      searchStartDate: '',
      searchEndDate: '',
      isSearching: false
    });
    this.loadBills();
  },

  // 编辑账单 - 存到全局，切换到记账页时读取
  editBill(e) {
    const billId = e.currentTarget.dataset.id;
    if (!billId) return;
    wx.setStorageSync('editBillId', billId);
    wx.switchTab({ url: '/pages/add/add' });
  },

  onPullDownRefresh() {
    this.loadBills();
    wx.stopPullDownRefresh();
  },

  // 按支出/收入筛选
  filterByType(e) {
    const type = e.currentTarget.dataset.type;
    const { filterType } = this.data;

    // 如果点击的是当前筛选类型，则取消筛选
    if (filterType === type) {
      this.setData({ filterType: '' });
    } else {
      this.setData({ filterType: type });
    }
    this.loadBills();
  },

  // 触摸开始
  onTouchStart(e) {
    this.setData({
      touchStartX: e.touches[0].clientX
    });
  },

  // 触摸移动
  onTouchMove(e) {
    const currentX = e.touches[0].clientX;
    const diffX = this.data.touchStartX - currentX;
    const billId = e.currentTarget.dataset.id;

    // 左滑（从右往左滑）打开删除按钮
    if (diffX > 30) {
      this.openSlide(billId);
    }
    // 右滑关闭删除按钮
    else if (diffX < -30) {
      this.closeSlide(billId);
    }
  },

  // 触摸结束
  onTouchEnd(e) {
    return;
  },

  // 打开左滑
  openSlide(billId) {
    const { groupedBills } = this.data;
    const newGroupedBills = groupedBills.map(group => ({
      ...group,
      bills: group.bills.map(bill =>
        bill.id === billId ? { ...bill, slideOpen: true } : { ...bill, slideOpen: false }
      )
    }));
    this.setData({ groupedBills: newGroupedBills });
  },

  // 关闭左滑
  closeSlide(billId) {
    const { groupedBills } = this.data;
    const newGroupedBills = groupedBills.map(group => ({
      ...group,
      bills: group.bills.map(bill =>
        bill.id === billId ? { ...bill, slideOpen: false } : bill
      )
    }));
    this.setData({ groupedBills: newGroupedBills });
  },

  // 删除账单
  deleteBill(e) {
    const billId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条账单记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 从 storage 中删除
          storage.deleteBill(billId);

          // 重新加载数据
          this.loadBills();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 切换搜索面板显示
  toggleSearchPanel() {
    const { showSearchPanel } = this.data;
    this.setData({ showSearchPanel: !showSearchPanel });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 清空关键词
  clearKeyword() {
    this.setData({ searchKeyword: '' });
  },

  // 开始日期选择
  onStartDateChange(e) {
    this.setData({ searchStartDate: e.detail.value });
  },

  // 结束日期选择
  onEndDateChange(e) {
    this.setData({ searchEndDate: e.detail.value });
  },

  // 重置搜索
  resetSearch() {
    this.setData({
      showSearchPanel: false,
      searchKeyword: '',
      searchStartDate: '',
      searchEndDate: '',
      isSearching: false
    });
    this.loadBills();
  },

  // 确认搜索
  confirmSearch() {
    const { searchKeyword, searchStartDate, searchEndDate } = this.data;

    // 设置搜索状态
    this.setData({ isSearching: true, showSearchPanel: false });
    this.loadBills();
  },

  // 清除搜索并重新加载（切换tab或年月选择变化时调用）
  clearSearchAndReload() {
    this.setData({
      searchKeyword: '',
      searchStartDate: '',
      searchEndDate: '',
      isSearching: false
    });
    this.loadBills();
  }
});