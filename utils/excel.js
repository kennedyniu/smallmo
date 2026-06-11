// utils/excel.js - Excel导入导出工具
const storage = require('./storage.js');

/**
 * 生成导入模板（包含标题和一行样例数据）
 * @return {Object} 模板文件 {filename, content}
 */
function generateImportTemplate() {
  // 构建HTML表格内容
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
             'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
             'xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="UTF-8"><style>td{white-space:nowrap;}</style></head><body>';
  html += '<table border="1">';

  // 表头（带颜色）
  html += '<tr style="background-color:#92D050;font-weight:bold;">';
  html += '<td>日期</td>';
  html += '<td>金额</td>';
  html += '<td>收支类型</td>';
  html += '<td>分类</td>';
  html += '<td>账本名称</td>';
  html += '<td>备注</td>';
  html += '</tr>';

  // 样例数据
  html += '<tr>';
  html += '<td>2024-01-01</td>';
  html += '<td>100.00</td>';
  html += '<td>支出</td>';
  html += '<td>餐饮</td>';
  html += '<td>默认账本</td>';
  html += '<td>样例备注</td>';
  html += '</tr>';

  html += '</table></body></html>';

  return {
    filename: '账单导入模板.xls',
    content: html
  };
}

/**
 * 导出账单为XLS格式
 * @param {Array} accountIds - 账本ID数组
 * @param {number} startDate - 开始时间戳
 * @param {number} endDate - 结束时间戳
 * @return {Object} 导出结果 {filename, content}
 */
function exportToXLS(accountIds, startDate, endDate) {
  let bills = storage.getBillsByDateRange(accountIds, startDate, endDate);

  // 先按单据日期降序，再按创建日期降序
  bills.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date - a.date; // 单据日期降序
    }
    return (b.createTime || 0) - (a.createTime || 0); // 创建日期降序
  });

  const accounts = storage.getAccounts();

  // 构建HTML表格内容（Excel可识别，兼容性最好）
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
             'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
             'xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="UTF-8"><style>td{white-space:nowrap;}</style></head><body>';
  html += '<table border="1">';

  // 表头（带颜色）
  html += '<tr style="background-color:#92D050;font-weight:bold;">';
  html += '<td>日期</td>';
  html += '<td>金额</td>';
  html += '<td>收支类型</td>';
  html += '<td>分类</td>';
  html += '<td>账本名称</td>';
  html += '<td>备注</td>';
  html += '</tr>';

  // 数据行
  bills.forEach(bill => {
    const account = accounts.find(a => a.id === bill.accountId);
    html += '<tr>';
    html += '<td>' + escapeHtml(storage.formatDate(bill.date, 'YYYY-MM-DD')) + '</td>';
    html += '<td>' + escapeHtml(String(bill.amount)) + '</td>';
    html += '<td>' + escapeHtml(bill.type === 'expense' ? '支出' : '收入') + '</td>';
    html += '<td>' + escapeHtml(storage.getCategoryName(bill.type, bill.categoryId)) + '</td>';
    html += '<td>' + escapeHtml(account ? account.name : '') + '</td>';
    html += '<td>' + escapeHtml(String(bill.remark || '')) + '</td>';
    html += '</tr>';
  });

  html += '</table></body></html>';

  // 生成文件名：根据开始和结束月份生成
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth() + 1;
  const endYear = endDateObj.getFullYear();
  const endMonth = endDateObj.getMonth() + 1;

  let filename;
  if (startYear === endYear && startMonth === endMonth) {
    // 同一月
    filename = `账单_${startYear}年${startMonth}月.xls`;
  } else if (startYear === endYear) {
    // 同一年，不同月
    filename = `账单_${startYear}年${startMonth}月至${endMonth}月.xls`;
  } else {
    // 不同年
    filename = `账单_${startYear}年${startMonth}月至${endYear}年${endMonth}月.xls`;
  }

  return {
    filename: filename,
    content: html
  };
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 校验单行数据
 * @param {Array} row - 行数据
 * @param {number} rowIndex - 行索引
 * @return {Object} {valid: boolean, errors: Array}
 */
function validateRow(row, rowIndex) {
  const errors = [];

  // 列：日期, 金额, 收支类型, 分类, 账本名称, 备注
  const dateStr = String(row[0] || '').trim();
  const amountStr = String(row[1] || '').trim();
  const typeStr = String(row[2] || '').trim();
  const categoryName = String(row[3] || '').trim();
  const accountName = String(row[4] || '').trim();
  const remark = String(row[5] || '').trim();

  // 必填校验
  if (!dateStr) {
    errors.push('日期不能为空');
  }
  if (!amountStr) {
    errors.push('金额不能为空');
  }
  if (!categoryName) {
    errors.push('分类不能为空');
  }
  if (!accountName) {
    errors.push('账本名称不能为空');
  }

  // 日期格式校验：支持多种格式 yyyy-mm-dd, yyyy/m/d, yyyy/mm/dd 等
  if (dateStr) {
    // 统一转换为标准格式 yyyy-mm-dd
    let normalizedDate = dateStr.replace(/[\/\.]/g, '-');
    // 处理多种分隔符的情况，例如 2026-4-5 -> 2026-04-05
    const parts = normalizedDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      normalizedDate = `${year}-${month}-${day}`;
    }

    // 校验转换后的格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(normalizedDate)) {
      errors.push('日期格式错误');
    } else {
      const parsed = new Date(normalizedDate);
      if (isNaN(parsed.getTime())) {
        errors.push('日期格式错误');
      }
    }
  }

  // 金额数字校验：整数位数不能超8位，小数不能超2位
  if (amountStr) {
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      errors.push('金额不是有效数字');
    } else {
      // 检查是否为负数
      if (amount < 0) {
        errors.push('金额不能为负数');
      }
      // 检查整数位数（去掉小数点后的数字）
      const intPart = Math.floor(amount).toString();
      if (intPart.length > 8) {
        errors.push('金额整数位最多8位');
      }
      // 检查小数位数
      const decimalPart = amountStr.split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        errors.push('金额小数位最多2位');
      }
    }
  }

  // 收支类型校验：只能是"支出"或"收入"
  if (typeStr && typeStr !== '支出' && typeStr !== '收入') {
    errors.push('收支类型应为"支出"或"收入"');
  }

  // 分类长度校验：不能超过4个字
  if (categoryName && categoryName.length > 4) {
    errors.push('分类名称最长4个字符');
  }

  // 账本名称长度校验：不能超过8个字
  if (accountName && accountName.length > 8) {
    errors.push('账本名称最长8个字符');
  }

  // 备注长度校验：不能超过50个字
  if (remark && remark.length > 50) {
    errors.push('备注最长50个字符');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 校验标题行
 * @param {Array} header - 标题行
 * @return {Object} {valid: boolean, error: string}
 */
function validateHeader(header) {
  const expectedHeaders = ['日期', '金额', '收支类型', '分类', '账本名称', '备注'];
  const actualHeaders = (header || []).map(h => String(h || '').trim());

  if (actualHeaders.length < 6) {
    return { valid: false, error: '标题列数不足，需要至少6列' };
  }

  for (let i = 0; i < 6; i++) {
    if (actualHeaders[i] !== expectedHeaders[i]) {
      return { valid: false, error: `第${i + 1}列标题应为"${expectedHeaders[i]}"，实际为"${actualHeaders[i]}"` };
    }
  }

  return { valid: true, error: '' };
}

/**
 * 导入账单（含校验）
 * @param {Array} data - Excel数据数组（二维数组）
 * @return {Object} 导入结果 {success, added, failed, errorRows}
 */
function importBills(data) {
  if (!data || data.length < 2) {
    return { success: false, added: 0, failed: 0, errorRows: [], error: '数据不能为空' };
  }

  // 校验标题
  const headerResult = validateHeader(data[0]);
  if (!headerResult.valid) {
    return { success: false, added: 0, failed: 0, errorRows: [], error: headerResult.error };
  }

  const rows = data.slice(1);
  const errorRows = [];
  const validRows = [];
  let added = 0;

  const existingBills = storage.getBills();
  const existingIds = new Set(existingBills.map(b => b.id));
  const accounts = storage.getAccounts();

  // 先收集所有需要创建的账本和分类
  const newAccounts = [];
  const newCategories = { expense: [], income: [] };

  rows.forEach((row, index) => {
    const rowNum = index + 2; // 行号从2开始（1是标题）
    const validation = validateRow(row, index);

    if (!validation.valid) {
      // 收集错误行（包含原始数据和错误原因）
      errorRows.push({
        rowNum: rowNum,
        data: row,
        errors: validation.errors
      });
    } else {
      validRows.push({ row, index });
    }
  });

  // 如果有错误，直接返回错误信息
  if (errorRows.length > 0) {
    return {
      success: false,
      added: 0,
      failed: errorRows.length,
      errorRows: errorRows,
      error: `校验失败，请修正后重新导入`
    };
  }

  // 处理有效数据
  for (const { row } of validRows) {
    const dateStr = String(row[0] || '').trim();
    const amountStr = String(row[1] || '').trim();
    const typeStr = String(row[2] || '').trim();
    const categoryName = String(row[3] || '').trim();
    const accountName = String(row[4] || '').trim();
    const remark = String(row[5] || '').trim();

    // 处理账本
    let accountId = storage.getCurrentAccountId();
    let account = accounts.find(a => a.name === accountName);
    if (!account) {
      // 创建新账本
      account = storage.createAccount(accountName);
      if (account.error) {
        // 账本名称重复，使用已存在的账本
        account = accounts.find(a => a.name === accountName);
        if (!account) {
          continue; // 跳过这行数据
        }
      }
      accountId = account.id;
    } else {
      accountId = account.id;
    }

    // 处理分类
    const type = typeStr === '支出' ? 'expense' : 'income';
    const categories = storage.getCategories();
    const categoryList = categories[type] || [];
    let category = categoryList.find(c => c.name === categoryName);

    if (!category) {
      // 创建新分类
      category = {
        id: storage.generateId(),
        name: categoryName,
        icon: '📦'
      };
      categories[type].push(category);
      wx.setStorageSync('categories', categories);
    }

    // 添加账单
    storage.addBill({
      id: storage.generateId(),
      accountId: accountId,
      // 标准化日期格式并解析
      date: parseNormalizedDate(dateStr),
      amount: parseFloat(amountStr),
      type: type,
      categoryId: category.id,
      remark: remark
    });

    added++;
  }

  return {
    success: true,
    added: added,
    failed: 0,
    errorRows: [],
    error: ''
  };
}

/**
 * 生成错误报告Excel
 * @param {Array} data - 原始数据
 * @param {Array} errorRows - 错误行数组
 * @return {Object} {filename, content}
 */
function generateErrorReport(data, errorRows) {
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
             'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
             'xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="UTF-8"><style>td{white-space:nowrap;}</style></head><body>';
  html += '<table border="1">';

  // 表头（带颜色）+ 错误原因列
  const headerRow = data[0] || ['日期', '金额', '收支类型', '分类', '账本名称', '备注'];
  html += '<tr style="background-color:#92D050;font-weight:bold;">';
  (headerRow || []).forEach(h => {
    html += '<td>' + escapeHtml(String(h)) + '</td>';
  });
  html += '<td>错误原因</td>';
  html += '</tr>';

  // 数据行
  const dataRows = data.slice(1);
  const errorMap = {};
  errorRows.forEach(err => {
    errorMap[err.rowNum - 2] = err.errors.join('; ');
  });

  dataRows.forEach((row, index) => {
    html += '<tr>';
    (row || []).forEach(cell => {
      html += '<td>' + escapeHtml(String(cell || '')) + '</td>';
    });
    // 添加错误原因列
    const errorMsg = errorMap[index] || '';
    if (errorMsg) {
      html += '<td style="color:red;">' + escapeHtml(errorMsg) + '</td>';
    } else {
      html += '<td></td>';
    }
    html += '</tr>';
  });

  html += '</table></body></html>';

  return {
    filename: '账单导入错误报告.xls',
    content: html
  };
}

/**
 * 选择并导入CSV文件
 * @return {Promise}
 */
function chooseAndImport() {
  return new Promise((resolve, reject) => {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv'],
      success: (res) => {
        const filePath = res.tempFiles[0].path;
        const fileManager = wx.getFileSystemManager();

        fileManager.readFile({
          filePath: filePath,
          encoding: 'utf8',
          success: (data) => {
            const result = parseCSV(data.data);
            resolve(result);
          },
          fail: (err) => {
            reject(err);
          }
        });
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 解析CSV数据
 * @param {string} csvContent - CSV内容
 * @return {Array} 二维数组
 */
/**
 * 标准化日期字符串并解析为时间戳
 * 支持格式: yyyy-mm-dd, yyyy/m/d, yyyy.mm.dd, yyyy-mm-d, yyyy/m/dd 等
 * @param {string} dateStr - 日期字符串
 * @return {number} 时间戳
 */
function parseNormalizedDate(dateStr) {
  if (!dateStr) return Date.now();

  // 将所有分隔符统一为-
  let normalized = dateStr.trim().replace(/[\/\.]/g, '-');
  const parts = normalized.split('-');

  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 月份从0开始
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  // 如果解析失败，尝试直接解析
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? Date.now() : fallback.getTime();
}

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const result = [];

  lines.forEach(line => {
    const row = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i < line.length - 1 ? line[i + 1] : '';

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        // 双引号转义
        current += '"';
        i++; // 跳过下一个引号
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    // 添加最后一个字段
    row.push(current.trim());
    result.push(row);
  });

  return result;
}

module.exports = {
  generateImportTemplate,
  exportToXLS,
  importBills,
  generateErrorReport,
  chooseAndImport,
  parseCSV
};