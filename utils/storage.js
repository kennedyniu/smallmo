// utils/storage.js - 本地存储工具
const app = getApp();
const cloudDb = require('./cloudDb.js');

/**
 * 获取所有账本
 */
function getAccounts() {
  return wx.getStorageSync('accounts') || [];
}

/**
 * 获取当前账本ID
 */
function getCurrentAccountId() {
  return wx.getStorageSync('currentAccount');
}

/**
 * 获取当前多个账本ID
 * 返回 null 表示没有设置过选择，返回 [] 表示选择了全选，返回具体数组表示选择了特定账本
 */
function getCurrentAccountIds() {
  const value = wx.getStorageSync('currentAccounts');
  if (value === undefined || value === null) {
    return null; // 没有设置过
  }
  return value; // 可能为空数组（表示全选）或具体数组
}

/**
 * 获取当前账本
 */
function getCurrentAccount() {
  const accounts = getAccounts();
  const currentId = getCurrentAccountId();
  return accounts.find(a => a.id === currentId) || accounts[0];
}

/**
 * 切换当前账本
 */
function setCurrentAccount(accountId) {
  wx.setStorageSync('currentAccount', accountId);
  app.globalData.currentAccount = accountId;
}

/**
 * 设置当前多个账本
 */
function setCurrentAccountIds(accountIds) {
  wx.setStorageSync('currentAccounts', accountIds);
  app.globalData.currentAccounts = accountIds;
}

/**
 * 创建新账本
 */
function createAccount(name) {
  const accounts = getAccounts();

  // 检查账本名称是否重复
  if (accounts.some(a => a.name === name)) {
    return { error: '账本名称已存在' };
  }

  const now = Date.now();
  const newAccount = {
    id: generateId(),
    name: name,
    createTime: now,
    updateTime: now
  };
  accounts.push(newAccount);
  wx.setStorageSync('accounts', accounts);
  // 同步到云端
  cloudDb.syncAccountToCloud(newAccount);
  return newAccount;
}

/**
 * 更新账本名称
 */
function updateAccountName(accountId, name) {
  const accounts = getAccounts();

  // 检查账本名称是否重复（排除当前账本）
  if (accounts.some(a => a.id !== accountId && a.name === name)) {
    return { error: '账本名称已存在' };
  }

  const index = accounts.findIndex(a => a.id === accountId);
  if (index !== -1) {
    accounts[index].name = name;
    accounts[index].updateTime = Date.now();
    wx.setStorageSync('accounts', accounts);
    // 同步到云端
    cloudDb.syncAccountToCloud(accounts[index]);
    return accounts[index];
  }
  return null;
}

/**
 * 删除账本
 * @param {string} accountId - 账本ID
 * @param {boolean} deleteCloudBills - 是否删除云端账单（默认true，直接删除时传false）
 */
function deleteAccount(accountId, deleteCloudBills = true) {
  let accounts = getAccounts();
  accounts = accounts.filter(a => a.id !== accountId);
  wx.setStorageSync('accounts', accounts);

  // 从云端删除账本
  cloudDb.deleteAccountFromCloud(accountId);

  // 是否删除云端账单
  // 迁移账单时不需要删除云端账单，因为账单已迁移到新账本
  if (deleteCloudBills) {
    cloudDb.deleteBillsByAccountFromCloud(accountId);
  }

  // 如果删除的是当前账本，切换到第一个
  if (getCurrentAccountId() === accountId && accounts.length > 0) {
    setCurrentAccount(accounts[0].id);
  }

  // 清理多选账本中已删除的账本
  const currentAccountIds = getCurrentAccountIds();
  if (currentAccountIds && currentAccountIds.length > 0) {
    const newAccountIds = currentAccountIds.filter(id => id !== accountId);
    setCurrentAccountIds(newAccountIds);
  }

  // 删除该账本的所有账单
  let bills = getBills();
  bills = bills.filter(b => b.accountId !== accountId);
  wx.setStorageSync('bills', bills);
}

/**
 * 获取所有分类
 */
function getCategories() {
  return wx.getStorageSync('categories') || { expense: [], income: [] };
}

/**
 * 获取支出分类
 */
function getExpenseCategories() {
  return getCategories().expense || [];
}

/**
 * 获取收入分类
 */
function getIncomeCategories() {
  return getCategories().income || [];
}

/**
 * 添加分类
 */
function addCategory(type, category) {
  const categories = getCategories();
  category.id = generateId();
  category.updateTime = Date.now();
  categories[type].push(category);
  categories.updateTime = Date.now();
  wx.setStorageSync('categories', categories);
  // 同步到云端
  cloudDb.syncCategoriesToCloud(categories);
  return category;
}

/**
 * 删除分类
 * @param {string} type - 类别类型（expense/income）
 * @param {string} categoryId - 分类ID
 * @param {boolean} deleteCloudBills - 是否删除云端账单（默认true，直接删除时传false）
 */
function deleteCategory(type, categoryId, deleteCloudBills = true) {
  const categories = getCategories();
  categories[type] = categories[type].filter(c => c.id !== categoryId);
  categories.updateTime = Date.now();
  wx.setStorageSync('categories', categories);
  // 是否删除云端账单
  // 迁移账单时不需要删除云端账单，因为账单已迁移到新类别
  if (deleteCloudBills) {
    cloudDb.deleteBillsByCategoryFromCloud(categoryId);
  }
  // 同步分类到云端
  cloudDb.syncCategoriesToCloud(categories);
}

/**
 * 更新分类
 */
function updateCategory(type, categoryId, newData) {
  const categories = getCategories();
  const index = categories[type].findIndex(c => c.id === categoryId);
  if (index !== -1) {
    categories[type][index] = { ...categories[type][index], ...newData, updateTime: Date.now() };
    categories.updateTime = Date.now();
    wx.setStorageSync('categories', categories);
    // 同步到云端
    cloudDb.syncCategoriesToCloud(categories);
    return categories[type][index];
  }
  return null;
}

/**
 * 更新分类排序
 */
function updateCategoriesOrder(type, newOrder) {
  const categories = getCategories();
  categories[type] = newOrder;
  categories.updateTime = Date.now();
  wx.setStorageSync('categories', categories);
  // 同步到云端
  cloudDb.syncCategoriesToCloud(categories);
}

/**
 * 获取所有账单
 */
function getBills() {
  return wx.getStorageSync('bills') || [];
}

/**
 * 获取指定账本的账单
 */
function getBillsByAccount(accountId) {
  return getBills().filter(b => b.accountId === accountId);
}

/**
 * 获取指定时间范围的账单
 */
function getBillsByDateRange(accountIds, startDate, endDate) {
  const bills = getBills();
  // 获取第一个账本ID作为默认值（旧账单可能没有 accountId）
  const accounts = getAccounts();
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : null;

  return bills.filter(b => {
    // 获取账本的 accountId（如果没有则使用第一个账本的 ID）
    const billAccountId = b.accountId || defaultAccountId;

    // 如果指定了账本筛选，检查账单是否在选中账本中
    if (accountIds && accountIds.length > 0 && !accountIds.includes(billAccountId)) {
      return false;
    }
    const billDate = new Date(b.date).getTime();
    return billDate >= startDate && billDate <= endDate;
  });
}

/**
 * 获取指定类别的账单数量
 */
function getBillCountByCategory(categoryId) {
  const bills = getBills();
  return bills.filter(b => b.categoryId === categoryId).length;
}

/**
 * 更新账单类别（用于迁移账单）
 */
function updateBillsCategory(oldCategoryId, newCategoryId) {
  const bills = getBills();
  bills.forEach(bill => {
    if (bill.categoryId === oldCategoryId) {
      bill.categoryId = newCategoryId;
      bill.updateTime = Date.now();
      // 同步到云端
      cloudDb.syncBillToCloud(bill);
    }
  });
  wx.setStorageSync('bills', bills);
}

/**
 * 更新账单账本（用于迁移账单）
 */
function updateBillsAccount(oldAccountId, newAccountId) {
  const bills = getBills();
  bills.forEach(bill => {
    if (bill.accountId === oldAccountId) {
      bill.accountId = newAccountId;
      bill.updateTime = Date.now();
      // 同步到云端
      cloudDb.syncBillToCloud(bill);
    }
  });
  wx.setStorageSync('bills', bills);
}

/**
 * 添加账单
 */
function addBill(bill) {
  const bills = getBills();
  const now = Date.now();
  bill.id = generateId();
  bill.createTime = now;
  bill.updateTime = now;
  bills.push(bill);
  wx.setStorageSync('bills', bills);
  // 同步到云端
  cloudDb.syncBillToCloud(bill);
  return bill;
}

/**
 * 更新账单
 */
function updateBill(billId, updates) {
  const bills = getBills();
  const index = bills.findIndex(b => b.id === billId);
  if (index !== -1) {
    bills[index] = { ...bills[index], ...updates, updateTime: Date.now() };
    wx.setStorageSync('bills', bills);
    // 同步到云端
    cloudDb.syncBillToCloud(bills[index]);
    return bills[index];
  }
  return null;
}

/**
 * 删除账单
 */
function deleteBill(billId) {
  const bills = getBills();
  const newBills = bills.filter(b => b.id !== billId);
  wx.setStorageSync('bills', newBills);
  // 从云端删除
  cloudDb.deleteBillFromCloud(billId);
}

/**
 * 获取设置
 */
function getSettings() {
  const defaultSettings = { theme: 'simple', enableRecentCategorySort: true, enableCloud: false };
  const saved = wx.getStorageSync('settings') || {};
  // 强制让 enableCloud 默认为 false（关闭云同步）
  const merged = { ...defaultSettings, ...saved };
  if (saved.enableCloud === undefined || saved.enableCloud === null) {
    merged.enableCloud = false;
  }
  return merged;
}

/**
 * 更新设置
 */
function updateSettings(updates) {
  const settings = getSettings();
  const newSettings = { ...settings, ...updates, updateTime: Date.now() };
  wx.setStorageSync('settings', newSettings);
  app.globalData.theme = newSettings.theme;
  // 同步到云端
  cloudDb.syncSettingsToCloud(newSettings);
  return newSettings;
}

/**
 * 生成唯一ID
 */
function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 格式化日期
 */
function formatDate(timestamp, format = 'YYYY-MM-DD') {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute);
}

/**
 * 获取本月起始时间
 */
function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/**
 * 获取本月结束时间
 */
function getMonthEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
}

/**
 * 获取上月起始时间
 */
function getLastMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
}

/**
 * 获取上月结束时间
 */
function getLastMonthEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();
}

/**
 * 获取本年起始时间
 */
function getYearStart() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1).getTime();
}

/**
 * 获取本年结束时间
 */
function getYearEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime();
}

/**
 * 获取上年起始时间
 */
function getLastYearStart() {
  const now = new Date();
  return new Date(now.getFullYear() - 1, 0, 1).getTime();
}

/**
 * 获取上年结束时间
 */
function getLastYearEnd() {
  const now = new Date();
  return new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).getTime();
}

/**
 * 获取账本名称
 */
function getAccountName(accountId) {
  const accounts = getAccounts();
  const account = accounts.find(a => a.id === accountId);
  return account ? account.name : '';
}

/**
 * 获取分类名称
 */
function getCategoryName(type, categoryId) {
  const categories = getCategories();
  const list = categories[type] || [];
  const category = list.find(c => c.id === categoryId);
  return category ? category.name : '';
}

/**
 * 获取分类图标
 */
function getCategoryIcon(type, categoryId) {
  const categories = getCategories();
  const list = categories[type] || [];
  const category = list.find(c => c.id === categoryId);
  return category ? category.icon : '';
}

// 保存最后记账的信息（日期和账本），用于跳转页面时默认选中
function setLastBillInfo(info) {
  wx.setStorageSync('lastBillInfo', info);
}

// 获取最后记账的信息
function getLastBillInfo() {
  return wx.getStorageSync('lastBillInfo') || null;
}

module.exports = {
  getAccounts,
  getCurrentAccountId,
  getCurrentAccountIds,
  getCurrentAccount,
  setCurrentAccount,
  setCurrentAccountIds,
  createAccount,
  updateAccountName,
  deleteAccount,
  getCategories,
  getExpenseCategories,
  getIncomeCategories,
  addCategory,
  deleteCategory,
  updateCategory,
  updateCategoriesOrder,
  getBillCountByCategory,
  updateBillsCategory,
  updateBillsAccount,
  getBills,
  getBillsByAccount,
  getBillsByDateRange,
  addBill,
  updateBill,
  deleteBill,
  getSettings,
  updateSettings,
  generateId,
  formatDate,
  getMonthStart,
  getMonthEnd,
  getLastMonthStart,
  getLastMonthEnd,
  getYearStart,
  getYearEnd,
  getLastYearStart,
  getLastYearEnd,
  getAccountName,
  getCategoryName,
  getCategoryIcon,
  setLastBillInfo,
  getLastBillInfo
};