// pages/add/add.js
const storage = require('../../utils/storage.js');

Page({
  data: {
    theme: 'simple',
    type: 'expense',
    categories: [],
    expenseCategories: [],
    incomeCategories: [],
    selectedCategoryId: '',
    selectedCategory: {},
    amount: '',
    expression: '',
    displayAmount: '0',
    remark: '',
    date: '',
    dateBtnText: '今天',
    dateDisplayText: '',
    currentAccountName: '',
    accounts: [],

    // 全屏类别编辑器
    showCategoryEditor: false,
    editorCategories: [],
    editorDraggingIndex: -1,

    // 新增弹窗
    showAddModal: false,
    // 图标分类数据
    iconCategoriesData: {
      // 餐饮 - 食物餐饮
      '餐饮': ['🍔', '🍕', '🍜', '🍎', '🍗', '🍣', '🍩', '🍺', '☕', '🍳', '🥦', '🍇'],
      // 娱乐 - 娱乐休闲
      '娱乐': ['🎮', '🎬', '🎵', '🎤', '🎨', '📚', '⚽', '🏀', '🎾', '🏊', '🎣'],
      // 医疗 - 医疗健康
      '医疗': ['💊', '🏥', '💉', '❤️'],
      // 学习 - 教育培训
      '学习': ['📖', '✏️', '🎓'],
      // 交通 - 交通出行
      '交通': ['🚗', '🚕', '🚲', '✈️', '🚇', '🚌', '🚆', '🛵'],
      // 购物 - 购物消费
      '购物': ['🛒', '👕', '👟', '👓', '💍', '📱', '💻', '🎧', '👜', '👔', '👗'],
      // 生活 - 日常用品
      '生活': ['🧴', '🧼', '💡', '🧹', '🧺', '🧽'],
      // 个人 - 个人护理
      '个人': ['💄', '💅', '✂️', '🪒', '🪞'],
      // 家居 - 家居生活
      '家居': ['🏠', '🔑', '🛏️', '🚿', '🪑', '🛋️', '🚪'],
      // 家庭 - 家庭相关
      '家庭': ['👨‍👩‍👧‍👦', '👪', '🏡', '👶', '🧸'],
      // 健身 - 运动健身
      '健身': ['⚽', '🏀', '🏊', '🚴', '🧘', '🏃'],
      // 办公 - 办公工作
      '办公': ['💼', '📎', '🖋️', '📁', '🖨️'],
      // 收入 - 金融财务
      '收入': ['💰', '💳', '💵', '💴', '💶', '💷', '🏦', '📈'],
      // 其他 - 人情礼物、宠物等
      '其他': ['🎁', '🎂', '💐', '💎', '🐶', '🐱', '🐰', '🎈', '🎉']
    },
    // 图标分类顺序（根据收支类型动态计算）
    iconCategories: [],
    // 所有图标的扁平数组（用于兼容现有逻辑）
    iconOptions: [],
    selectedIcon: '🍔',
    newCategoryName: '',

    // 删除弹窗
    showDeleteModal: false,
    deleteTarget: {},
    showMigrateModal: false,
    migrateOptions: [],
    migrateTargetId: '',

    // 编辑账单
    editBillId: '',
    isEditing: false
  },

  // 阻止事件冒泡
  stopPropagation() {},

  onLoad(options) {
    // 启用分享菜单
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${('0' + (today.getMonth() + 1)).slice(-2)}-${('0' + today.getDate()).slice(-2)}`;
    const displayText = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    this.setData({
      date: dateStr,
      dateDisplayText: displayText
    });

    // 加载类别和账本，并排序
    this.loadCategories();
    this.loadAccounts();
  },

  onShareAppMessage() {
    return {
      title: '小沐账本 - 简单实用的记账小程序',
      path: '/pages/add/add',
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

    this.applyTheme();
    this.loadAccounts();

    // 先重置为新增模式
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${('0' + (today.getMonth() + 1)).slice(-2)}-${('0' + today.getDate()).slice(-2)}`;
    const displayText = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    this.setData({
      type: 'expense',
      amount: '',
      expression: '',
      displayAmount: '0',
      selectedCategoryId: '',
      selectedCategory: {},
      date: dateStr,
      dateDisplayText: displayText,
      dateBtnText: '今天',
      remark: '',
      editBillId: '',
      isEditing: false
    });

    // 加载类别并排序（会在内部设置选中第一个类别）
    this.loadCategories();

    // 检查是否有编辑账单ID（从明细页跳转过来）
    const editBillId = wx.getStorageSync('editBillId');
    if (editBillId) {
      const bills = storage.getBills();
      const bill = bills.find(b => b.id == editBillId);
      if (bill) {
        const billAmountStr = bill.amount.toString();
        const billDate = new Date(bill.date);
        const billDateStr = `${billDate.getFullYear()}-${('0' + (billDate.getMonth() + 1)).slice(-2)}-${('0' + billDate.getDate()).slice(-2)}`;
        const billDisplayText = `${billDate.getFullYear()}年${billDate.getMonth() + 1}月${billDate.getDate()}日`;
        this.setData({
          type: bill.type,
          amount: billAmountStr,
          expression: billAmountStr,
          displayAmount: billAmountStr,
          selectedCategoryId: bill.categoryId,
          date: billDateStr,
          dateDisplayText: billDisplayText,
          dateBtnText: billDisplayText,
          remark: bill.remark || '',
          editBillId: editBillId,
          isEditing: true
        });
        this.updateCategoriesByType();
      }
      wx.removeStorageSync('editBillId');
    }

    // 加载类别（保持用户保存的排序）

    // 更新自定义 tabBar 的选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        currentIndex: 2  // 记账页是第 2 个
      });
    }
  },

  loadAccounts() {
    const accounts = storage.getAccounts();
    let currentAccountId = storage.getCurrentAccountId();

    // 检查当前账本是否已被删除，如果是则切换到第一个
    if (!currentAccountId || !accounts.some(a => a.id === currentAccountId)) {
      if (accounts.length > 0) {
        storage.setCurrentAccount(accounts[0].id);
        currentAccountId = accounts[0].id;
      }
    }

    const currentAccount = accounts.find(a => a.id === currentAccountId);
    this.setData({
      accounts,
      currentAccountName: currentAccount ? currentAccount.name : '选择账本'
    });
  },

  // 根据账本最近100笔账单按类别统计笔数排序
  sortCategoriesByRecentUsage(accountId) {
    // 检查是否启用常用类别排序
    const settings = storage.getSettings();
    if (!settings.enableRecentCategorySort) {
      // 未启用时保持原顺序
      const { type, expenseCategories, incomeCategories } = this.data;
      const categories = type === 'expense' ? expenseCategories : incomeCategories;
      if (!categories || categories.length === 0) return;
      const { selectedCategoryId } = this.data;
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      this.setData({
        categories,
        selectedCategoryId,
        selectedCategory: selectedCategory || categories[0] || {}
      });
      return;
    }

    // 获取当前类别数据
    const { type, expenseCategories, incomeCategories } = this.data;
    const categories = type === 'expense' ? expenseCategories : incomeCategories;

    // 如果类别为空，不处理
    if (!categories || categories.length === 0) return;

    // 如果没有账本，直接使用原顺序
    if (!accountId) {
      this.setData({
        categories: categories,
        selectedCategoryId: categories[0]?.id || '',
        selectedCategory: categories[0] || {}
      });
      return;
    }

    // 获取该账本最近100笔账单
    const allBills = storage.getBills();
    const accountBills = allBills
      .filter(b => b.accountId === accountId)
      .sort((a, b) => b.date - a.date) // 按时间倒序
      .slice(0, 100);

    // 如果没有账单，使用原顺序
    if (accountBills.length === 0) {
      this.setData({
        categories: categories,
        selectedCategoryId: categories[0]?.id || '',
        selectedCategory: categories[0] || {}
      });
      return;
    }

    // 按类别统计笔数
    const categoryCount = {};
    accountBills.forEach(bill => {
      if (!categoryCount[bill.categoryId]) {
        categoryCount[bill.categoryId] = 0;
      }
      categoryCount[bill.categoryId]++;
    });

    // 按笔数排序类别ID（降序）
    const sortedCategoryIds = Object.keys(categoryCount)
      .sort((a, b) => categoryCount[b] - categoryCount[a]);

    // 取前4个使用最多的类别ID
    const topFourIds = sortedCategoryIds.slice(0, 4);

    // 重新排序类别：前4个按笔数降序排列，其他按原顺序
    const topCategories = categories
      .filter(c => topFourIds.includes(c.id))
      .sort((a, b) => topFourIds.indexOf(a.id) - topFourIds.indexOf(b.id));
    const otherCategories = categories.filter(c => !topFourIds.includes(c.id));

    // 合并排序后的类别
    const sortedCategories = topCategories.concat(otherCategories);

    // 获取当前选中的类别ID
    const { selectedCategoryId } = this.data;
    // 检查当前选中类别是否存在且在前4个中
    const isInTopFour = selectedCategoryId && topFourIds.includes(selectedCategoryId);
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    if (!isInTopFour && sortedCategories.length > 0) {
      // 如果当前选中类别不在前4个，则选中排序后的第一个
      this.setData({
        categories: sortedCategories,
        selectedCategoryId: sortedCategories[0].id,
        selectedCategory: sortedCategories[0]
      });
    } else {
      // 保持选中类别，但更新categories顺序
      this.setData({
        categories: sortedCategories,
        selectedCategoryId: selectedCategoryId,
        selectedCategory: selectedCategory || sortedCategories[0]
      });
    }
  },

  showAccountPicker() {
    const { accounts } = this.data;
    wx.showActionSheet({
      itemList: accounts.map(a => a.name),
      success: (res) => {
        const selectedAccount = accounts[res.tapIndex];
        storage.setCurrentAccount(selectedAccount.id);
        this.setData({ currentAccountName: selectedAccount.name });
        // 切换账本后按该账本最近使用习惯排序类别
        this.sortCategoriesByRecentUsage(selectedAccount.id);
      }
    });
  },

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

  loadCategories() {
    const expenseCategories = storage.getExpenseCategories();
    const incomeCategories = storage.getIncomeCategories();
    this.setData({ expenseCategories, incomeCategories });
    this.updateCategoriesByType();
    // 加载类别后按账本最近使用习惯排序
    const currentAccountId = storage.getCurrentAccountId();
    this.sortCategoriesByRecentUsage(currentAccountId);
    // 确保第一个类别被选中
    const { categories, selectedCategoryId, selectedCategory } = this.data;
    if ((!selectedCategoryId || !selectedCategory || !selectedCategory.name) && categories && categories.length > 0) {
      this.setData({
        selectedCategoryId: categories[0].id,
        selectedCategory: categories[0]
      });
    }
  },

  updateCategoriesByType() {
    const { type, expenseCategories, incomeCategories } = this.data;
    const categories = type === 'expense' ? expenseCategories : incomeCategories;

    let selectedCategoryId = this.data.selectedCategoryId;
    let selectedCategory = this.data.selectedCategory;

    if (!selectedCategoryId || !categories.find(c => c.id === selectedCategoryId)) {
      if (categories.length > 0) {
        selectedCategoryId = categories[0].id;
        selectedCategory = categories[0];
      }
    } else {
      selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0] || {};
    }

    this.setData({ categories, selectedCategoryId, selectedCategory });
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ type, selectedCategoryId: '', selectedCategory: {}, showCategoryEditor: false });
    this.updateCategoriesByType();
    // 切换类型后按账本最近使用习惯排序类别
    const currentAccountId = storage.getCurrentAccountId();
    this.sortCategoriesByRecentUsage(currentAccountId);
  },

  // 单击类别项
  onCategoryItemTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === categoryId);
    this.setData({ selectedCategoryId: categoryId, selectedCategory: category });
  },

  // 长按进入全屏编辑模式
  onItemLongPress(e) {
    const { type, categories } = this.data;
    // 复制当前类别到编辑器
    this.setData({
      showCategoryEditor: true,
      editorCategories: categories.map(c => Object.assign({}, c)),
      editorDraggingIndex: -1
    });
    wx.vibrateShort();
  },

  // 点击类别区域（非编辑器内）
  onCategoryBarTap(e) {
    // 不处理
  },

  // 点击类别项
  onCategoryItemTap(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === categoryId);
    this.setData({ selectedCategoryId: categoryId, selectedCategory: category });
  },

  // ==================== 全屏类别编辑器 ====================

  // 编辑器拖动开始
  onEditorSortTouchStart(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ editorDraggingIndex: index });
    this._dragStartX = e.touches[0].clientX;
    this._dragStartY = e.touches[0].clientY;
    this._dragStartIndex = index;
  },

  // 编辑器拖动中
  onEditorSortTouchMove(e) {
    const { editorDraggingIndex, editorCategories } = this.data;
    if (editorDraggingIndex === -1 || this._dragStartIndex === undefined) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - this._dragStartX;
    const deltaY = currentY - this._dragStartY;

    // 计算移动距离
    const distance = Math.abs(deltaX) + Math.abs(deltaY);
    if (distance < 30) return; // 移动距离不够

    // 每行4个类别，计算移动位置
    const itemWidth = wx.getSystemInfoSync().windowWidth / 4;
    const itemHeight = 100;

    // 判断是水平移动还是垂直移动
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平移动 - 左右交换
      const moveCols = Math.round(deltaX / itemWidth);
      const newIndex = this._dragStartIndex + moveCols;
      const clampedIndex = Math.max(0, Math.min(newIndex, editorCategories.length - 1));

      if (clampedIndex !== editorDraggingIndex) {
        const newCategories = editorCategories.slice();
        const draggedItem = newCategories[editorDraggingIndex];
        newCategories.splice(editorDraggingIndex, 1);
        newCategories.splice(clampedIndex, 0, draggedItem);
        this.setData({ editorCategories: newCategories, editorDraggingIndex: clampedIndex });
        this._dragStartX = currentX;
        this._dragStartIndex = clampedIndex;
      }
    } else {
      // 垂直移动 - 上下交换
      const moveRows = Math.round(deltaY / itemHeight);
      const newIndex = this._dragStartIndex + moveRows * 4; // 每行4个
      const clampedIndex = Math.max(0, Math.min(newIndex, editorCategories.length - 1));

      if (clampedIndex !== editorDraggingIndex) {
        const newCategories = editorCategories.slice();
        const draggedItem = newCategories[editorDraggingIndex];
        newCategories.splice(editorDraggingIndex, 1);
        newCategories.splice(clampedIndex, 0, draggedItem);
        this.setData({ editorCategories: newCategories, editorDraggingIndex: clampedIndex });
        this._dragStartY = currentY;
        this._dragStartIndex = clampedIndex;
      }
    }
  },

  // 编辑器拖动结束
  onEditorSortTouchEnd(e) {
    this.setData({ editorDraggingIndex: -1 });
  },

  // 编辑器点击删除按钮
  onEditorDeleteTap(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    if (!id) return;

    const { type } = this.data;
    const billCount = storage.getBillCountByCategory(id);

    this.setData({
      showDeleteModal: true,
      deleteTarget: { id, name, billCount, fromEditor: true }
    });
  },

  // 编辑器直接删除
  editorDirectDeleteCategory() {
    const { type, deleteTarget, editorCategories } = this.data;
    storage.deleteCategory(type, deleteTarget.id);

    // 更新编辑器中的类别列表
    const newEditorCategories = editorCategories.filter(c => c.id !== deleteTarget.id);
    this.setData({ editorCategories: newEditorCategories });

    this.closeDeleteModal();
    wx.showToast({ title: '删除成功', icon: 'success' });
  },

  // 编辑器选择迁移目标
  editorSelectMigrateTarget(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ migrateTargetId: id });
  },

  // 编辑器确认迁移并删除
  editorConfirmMigrateAndDelete() {
    const { type, deleteTarget, migrateTargetId, editorCategories } = this.data;

    if (!migrateTargetId) {
      wx.showToast({ title: '请选择目标类别', icon: 'none' });
      return;
    }

    // 先迁移账单到新类别（会同步到云端）
    storage.updateBillsCategory(deleteTarget.id, migrateTargetId);
    // 删除类别，但不删除云端账单（账单已迁移到新类别）
    storage.deleteCategory(type, deleteTarget.id, false);

    // 更新编辑器中的类别列表
    const newEditorCategories = editorCategories.filter(c => c.id !== deleteTarget.id);
    this.setData({ editorCategories: newEditorCategories });

    this.closeMigrateModal();
    wx.showToast({ title: '已迁移并删除', icon: 'success' });
  },

  // 点击编辑器的空白区域保存并退出
  onEditorBlankTap(e) {
    // 检查是否点击的是空白区域（不是类别项）
    const target = e.target;
    const dataset = target.dataset || {};
    if (dataset.id || target.className.includes('category-item')) {
      return;
    }

    this.saveAndCloseEditor();
  },

  // 点击编辑器关闭按钮
  onEditorCloseTap() {
    this.saveAndCloseEditor();
  },

  // 保存排序并关闭编辑器
  saveAndCloseEditor() {
    const { type, editorCategories, categories } = this.data;

    // 检查是否有变化
    const hasChanges = JSON.stringify(editorCategories) !== JSON.stringify(categories);

    if (hasChanges) {
      // 保存新的排序到存储
      storage.updateCategoriesOrder(type, editorCategories);

      // 更新当前页面显示的类别（直接使用保存的排序，不再按最近使用习惯排序）
      this.setData({ categories: editorCategories });
    }

    // 关闭编辑器
    this.setData({
      showCategoryEditor: false,
      editorCategories: [],
      editorDraggingIndex: -1
    });

    if (hasChanges) {
      wx.showToast({ title: '排序已保存', icon: 'success' });
    }
  },

  // 点击删除按钮
  onDeleteBtnTap(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    if (!id) {
      return;
    }
    if (!this.data.isEditMode) {
      return;
    }
    this.handleDeleteCategory({ id, name });
  },

  // 处理删除类别
  handleDeleteCategory(category) {
    const { type } = this.data;
    const billCount = storage.getBillCountByCategory(category.id);

    // 总是弹出确认框
    this.setData({
      showDeleteModal: true,
      deleteTarget: { id: category.id, name: category.name, billCount, fromEditor: false }
    });
  },

  // 直接删除
  directDeleteCategory() {
    const { type, deleteTarget, editorCategories, showCategoryEditor } = this.data;

    if (deleteTarget.fromEditor) {
      // 来自编辑器，删除并更新编辑器列表
      storage.deleteCategory(type, deleteTarget.id);
      const newEditorCategories = editorCategories.filter(c => c.id !== deleteTarget.id);
      this.setData({ editorCategories: newEditorCategories });
      this.closeDeleteModal();
      wx.showToast({ title: '删除成功', icon: 'success' });
    } else {
      // 来自主页面
      storage.deleteCategory(type, deleteTarget.id);
      this.loadCategories();
      this.closeDeleteModal();
      wx.showToast({ title: '删除成功', icon: 'success' });
    }
  },

  // 显示迁移选项
  showMigrateOptions() {
    const { type, deleteTarget, editorCategories, showCategoryEditor } = this.data;

    let options;
    if (deleteTarget.fromEditor) {
      // 来自编辑器
      options = editorCategories.filter(c => c.id !== deleteTarget.id);
    } else {
      // 来自主页面
      const categories = this.data.categories;
      options = categories.filter(c => c.id !== deleteTarget.id);
    }

    this.setData({
      showDeleteModal: false,
      showMigrateModal: true,
      migrateOptions: options,
      migrateTargetId: ''
    });
  },

  // 选择迁移目标
  selectMigrateTarget(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ migrateTargetId: id });
  },

  // 确认迁移并删除
  confirmMigrateAndDelete() {
    const { type, deleteTarget, migrateTargetId, editorCategories, showCategoryEditor } = this.data;

    if (!migrateTargetId) {
      wx.showToast({ title: '请选择目标类别', icon: 'none' });
      return;
    }

    // 先迁移账单到新类别（会同步到云端）
    storage.updateBillsCategory(deleteTarget.id, migrateTargetId);
    // 删除类别，但不删除云端账单（账单已迁移到新类别）
    storage.deleteCategory(type, deleteTarget.id, false);

    if (deleteTarget.fromEditor) {
      // 来自编辑器，更新编辑器列表
      const newEditorCategories = editorCategories.filter(c => c.id !== deleteTarget.id);
      this.setData({ editorCategories: newEditorCategories });
    } else {
      // 来自主页面
      this.loadCategories();
    }

    this.closeMigrateModal();
    wx.showToast({ title: '已迁移并删除', icon: 'success' });
  },

  closeDeleteModal() {
    this.setData({ showDeleteModal: false, deleteTarget: {} });
  },

  closeMigrateModal() {
    this.setData({ showMigrateModal: false, migrateOptions: [], migrateTargetId: '' });
  },

  // ==================== 新增类别 ====================

  showAddModal() {
    const { type, iconCategoriesData } = this.data;

    // 根据收支类型确定分类顺序
    let categoryOrder;
    if (type === 'income') {
      // 收入类型：收入大类放最前面
      categoryOrder = ['收入', '餐饮', '娱乐', '医疗', '学习', '交通', '购物', '生活', '个人', '家居', '家庭', '健身', '办公', '其他'];
    } else {
      // 支出类型：餐饮大类放最前面
      categoryOrder = ['餐饮', '娱乐', '医疗', '学习', '交通', '购物', '生活', '个人', '家居', '家庭', '健身', '办公', '收入', '其他'];
    }

    // 按顺序构建分类数组
    const iconCategories = [];
    const allIcons = [];

    categoryOrder.forEach(categoryName => {
      if (iconCategoriesData[categoryName]) {
        iconCategories.push({
          name: categoryName,
          icons: iconCategoriesData[categoryName]
        });
        // 添加到扁平数组 - 兼容写法，避免使用展开运算符
        const icons = iconCategoriesData[categoryName];
        for (let i = 0; i < icons.length; i++) {
          allIcons.push(icons[i]);
        }
      }
    });

    this.setData({
      showAddModal: true,
      selectedIcon: '🍔',
      newCategoryName: '',
      iconCategories,
      iconOptions: allIcons
    });
  },

  closeAddModal() {
    this.setData({ showAddModal: false, selectedIcon: '🍔', newCategoryName: '' });
  },

  onCategoryNameInput(e) {
    let value = e.detail.value;

    // 判断是否包含汉字
    const hasChinese = /[\u4e00-\u9fa5]/.test(value);

    if (hasChinese) {
      // 包含汉字，限制最多4个汉字
      let chineseCount = 0;
      value = value.replace(/[\u4e00-\u9fa5]/g, (char) => {
        if (chineseCount < 4) {
          chineseCount++;
          return char;
        }
        return ''; // 超过4个汉字的部分移除
      });
    }
    // 如果是纯字母/数字（拼音），不限制长度，用户可以完整输入

    this.setData({ newCategoryName: value });
  },

  selectIcon(e) {
    this.setData({ selectedIcon: e.currentTarget.dataset.icon });
  },

  confirmAddCategory() {
    const { type, newCategoryName, selectedIcon, categories } = this.data;
    if (!newCategoryName || newCategoryName.trim() === '') {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    const name = newCategoryName.trim();

    // 校验名字唯一性
    const exists = categories.some(c => c.name === name);
    if (exists) {
      wx.showToast({ title: '该类别已存在', icon: 'none' });
      return;
    }

    storage.addCategory(type, { name, icon: selectedIcon });
    this.loadCategories();
    this.closeAddModal();
    wx.showToast({ title: '添加成功', icon: 'success' });
  },

  // ==================== 日期和键盘 ====================

  onDateChange(e) {
    const selectedDate = e.detail.value;
    const dateParts = selectedDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${('0' + (today.getMonth() + 1)).slice(-2)}-${('0' + today.getDate()).slice(-2)}`;

    let displayText;
    if (selectedDate === todayStr) {
      displayText = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    } else {
      displayText = `${year}年${month}月${day}日`;
    }

    this.setData({ date: selectedDate, dateDisplayText: displayText, dateBtnText: displayText });
  },

  onKeyTap(e) {
    this.inputAmount(e.currentTarget.dataset.value);
  },

  inputAmount(value) {
    let { expression } = this.data;

    if (value === '+' || value === '-') {
      if (!expression) return;
      if (/[+\-]$/.test(expression)) {
        expression = expression.slice(0, -1) + value;
      } else {
        expression += value;
      }
    } else {
      // 处理数字和小数点输入
      if (value === '.') {
        const lastNumber = expression.split(/[+\-]/).pop();
        if (lastNumber.includes('.')) return;
        if (!lastNumber) {
          expression += '0.';
          this.setData({ expression, displayAmount: expression || '0' });
          return;
        }
        // 允许输入小数点
      } else {
        // 输入的是数字 0-9
        // 获取当前正在输入的数字部分（最后一个数字）
        const parts = expression.split(/[+\-]/);
        let lastNumber = parts.pop() || '';
        // 如果最后一个字符是运算符，那么当前数字部分为空，需要新建
        if (expression.length > 0 && /[+\-]$/.test(expression)) {
          lastNumber = '';
        }
        // 检查整数和小数部分长度限制
        if (lastNumber.includes('.')) {
          // 有小数点，分别检查整数部分和小数部分
          const [integerPart, decimalPart] = lastNumber.split('.');
          if (decimalPart.length >= 2) {
            // 小数部分已达2位，不允许继续输入数字
            return;
          }
          // 整数部分限制8位
          if (integerPart.length >= 8) {
            return;
          }
        } else {
          // 没有小数点，只有整数部分
          if (lastNumber.length >= 8) {
            // 整数部分已达8位，不允许继续输入数字
            return;
          }
        }
      }
      expression += value;
    }

    let displayAmount = expression;

    this.setData({ expression, displayAmount });
  },

  calculate(expr) {
    if (!expr || expr === '') return 0;
    try {
      const parts = expr.replace(/[^0-9+\-.]/g, '');
      const numbers = parts.split(/[+\-]/).filter(n => n !== '');
      const operators = parts.match(/[+\-]/g) || [];
      if (numbers.length === 0) return 0;
      let result = parseFloat(numbers[0]) || 0;
      for (let i = 0; i < operators.length; i++) {
        const num = parseFloat(numbers[i + 1]) || 0;
        if (operators[i] === '+') result += num;
        else if (operators[i] === '-') result -= num;
      }
      return Math.round(result * 100) / 100;
    } catch (err) {
      return 0;
    }
  },

  deleteLast() {
    let { expression } = this.data;
    if (expression) {
      expression = expression.slice(0, -1);
      this.setData({ expression, displayAmount: expression || '0' });
    }
  },

  onRemarkInput(e) {
    let value = e.detail.value;
    // 限制最多20个字（字符）
    if (value.length > 20) {
      value = value.substring(0, 20);
    }
    this.setData({ remark: value });
  },

  onSaveBill() {
    this.saveBill(false);
  },

  onSaveAndContinue() {
    this.saveBill(true);
  },

  saveBill(continueFlag = false) {
    let { expression, selectedCategoryId, date, remark, displayAmount, editBillId, isEditing } = this.data;

    let finalExpression = expression;
    if (/[+\-]$/.test(finalExpression)) {
      finalExpression = finalExpression.slice(0, -1);
    }

    const finalAmount = this.calculate(finalExpression || '0');
    const displayNum = parseFloat(displayAmount);

    if (!displayNum || displayNum === 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' });
      return;
    }

    const billData = {
      type: this.data.type,
      amount: finalAmount,
      categoryId: selectedCategoryId || this.data.categories[0]?.id || '',
      accountId: storage.getCurrentAccountId(),
      date: new Date(date).getTime(),
      remark: remark.trim()
    };

    // 编辑模式更新，新增模式添加
    if (isEditing && editBillId) {
      storage.updateBill(editBillId, billData);
      wx.showToast({ title: '修改成功', icon: 'success' });
    } else {
      storage.addBill(billData);
      wx.showToast({ title: '记账成功', icon: 'success' });
    }

    // 保存最后记账的日期和账本信息，用于跳转明细页面时默认选中
    const billDate = new Date(billData.date);
    storage.setLastBillInfo({
      year: billDate.getFullYear(),
      month: billDate.getMonth() + 1,
      accountId: billData.accountId
    });

    this.setData({ expression: '', displayAmount: '0' });

    if (continueFlag) {
      this.setData({ remark: '', selectedCategoryId: '', selectedCategory: {}, isEditing: false, editBillId: '' });
      this.updateCategoriesByType();
      // 点击"下一笔"后也需要按最近使用习惯排序类别
      const currentAccountId = storage.getCurrentAccountId();
      this.sortCategoriesByRecentUsage(currentAccountId);
    } else {
      wx.switchTab({ url: '/pages/detail/detail' });
    }
  },

});