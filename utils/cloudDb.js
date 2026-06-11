// utils/cloudDb.js - 云数据库操作
// 注意：不在顶部获取 app 实例，而是在函数内部获取

/**
 * 判断是否启用云数据库
 * 从 localStorage 读取配置，默认关闭
 */
function isCloudEnabled() {
  const settings = wx.getStorageSync('settings') || {};
  // enableCloud 明确为 true 才开启（否则默认关闭）
  return settings.enableCloud === true;
}

/**
 * 获取 app 实例
 */
function getAppInstance() {
  return getApp();
}

/**
 * 初始化云开发
 */
function initCloud() {
  if (!isCloudEnabled()) {
    console.log('云数据库已禁用');
    return;
  }
  if (!wx.cloud) {
    console.error('请使用 2.2.3 或以上的基础库以使用云能力');
  } else {
    wx.cloud.init({
      env: 'cloudbase-d6g0cd5u346a1642c', // 替换为你的云开发环境ID
      traceUser: true
    });
  }
}

/**
 * 获取云数据库引用
 */
function getDb() {
  if (!isCloudEnabled()) return null;
  return wx.cloud.database();
}

/**
 * 获取用户openid
 */
function getOpenId() {
  return new Promise((resolve) => {
    if (!isCloudEnabled()) {
      resolve(null);
      return;
    }

    const app = getAppInstance();
    if (app && app.globalData && app.globalData.openid) {
      resolve(app.globalData.openid);
      return;
    }

    wx.cloud.callFunction({
      name: 'getOpenId'
    }).then(res => {
      if (app && app.globalData) {
        app.globalData.openid = res.result.openid;
      }
      resolve(res.result.openid);
    }).catch(err => {
      console.error('获取openid失败', err);
      resolve(null); // 返回 null 而不是抛出异常
    });
  });
}

/**
 * 从云端同步数据到本地（合并逻辑）
 * 1. 获取云端数据（按 openid 过滤）
 * 2. 与本地数据并集合并，按 updateTime 取最新
 * 3. 合并后写入本地
 * 4. 把本地多出的数据同步到云端（新增或更新）
 */
async function syncFromCloud() {
  if (!isCloudEnabled()) {
    console.log('云同步已禁用，跳过');
    return false;
  }

  try {
    const db = getDb();
    if (!db) return false;

    // 获取用户的 openid
    const openid = await getOpenId();
    if (!openid) {
      console.error('无法获取用户 openid，跳过云同步');
      return false;
    }

    // Step 1: 从云端拉取当前用户的数据（按 _openid 过滤）
    const accountsRes = await db.collection('accounts').where({
      _openid: openid
    }).get();
    const billsRes = await db.collection('bills').where({
      _openid: openid
    }).get();
    const categoriesRes = await db.collection('categories').where({
      _openid: openid
    }).get();
    const settingsRes = await db.collection('settings').where({
      _openid: openid
    }).limit(1).get();

    const cloudAccounts = accountsRes.data || [];
    const cloudBills = billsRes.data || [];
    const cloudCategories = categoriesRes.data.length > 0 ? categoriesRes.data[0].data : null;
    const cloudSettings = settingsRes.data.length > 0 ? settingsRes.data[0].data : null;

    // Step 2: 获取本地数据
    const localAccounts = wx.getStorageSync('accounts') || [];
    const localBills = wx.getStorageSync('bills') || [];
    const localCategories = wx.getStorageSync('categories');
    const localSettings = wx.getStorageSync('settings');

    // Step 3: 合并账本数据
    const mergedAccounts = mergeData(localAccounts, cloudAccounts, 'id');

    // Step 4: 合并账单数据
    const mergedBills = mergeData(localBills, cloudBills, 'id');

    // Step 5: 合并分类数据（按 updateTime 比较）
    const mergedCategories = mergeCategories(localCategories, cloudCategories);

    // Step 6: 合并设置数据
    const mergedSettings = mergeSettings(localSettings, cloudSettings);

    // Step 7: 写入本地存储
    wx.setStorageSync('accounts', mergedAccounts);
    wx.setStorageSync('bills', mergedBills);
    if (mergedCategories) {
      wx.setStorageSync('categories', mergedCategories);
    }
    if (mergedSettings) {
      wx.setStorageSync('settings', mergedSettings);
    }

    // Step 8: 把本地多出的数据同步到云端
    await syncLocalExtraToCloud(mergedAccounts, cloudAccounts, 'accounts', 'id');
    await syncLocalExtraToCloud(mergedBills, cloudBills, 'bills', 'id');
    if (mergedCategories) {
      await syncCategoriesToCloud(mergedCategories);
    }
    if (mergedSettings) {
      await syncSettingsToCloud(mergedSettings);
    }

    console.log('云端数据同步成功（合并模式）');
    return true;
  } catch (err) {
    console.error('云端数据同步失败', err);
    return false;
  }
}

/**
 * 合并两组数据，按 id 去重，按 updateTime 取最新
 */
function mergeData(localData, cloudData, idField) {
  const dataMap = new Map();

  // 先加入本地数据
  for (const item of localData) {
    const id = item[idField];
    // 兼容没有 updateTime 的旧数据
    item.updateTime = item.updateTime || item.createTime || 0;
    dataMap.set(id, item);
  }

  // 再加入云端数据，比较 updateTime
  for (const item of cloudData) {
    const id = item[idField];
    // 兼容没有 updateTime 的旧数据
    item.updateTime = item.updateTime || item.createTime || 0;

    if (dataMap.has(id)) {
      // 两边都有，比较 updateTime，保留最新
      const localItem = dataMap.get(id);
      if (item.updateTime > localItem.updateTime) {
        dataMap.set(id, item);
      }
    } else {
      // 云端有，本地没有，加入
      dataMap.set(id, item);
    }
  }

  return Array.from(dataMap.values());
}

/**
 * 合并分类数据
 */
function mergeCategories(localCategories, cloudCategories) {
  if (!localCategories && !cloudCategories) {
    return null;
  }
  if (!localCategories) {
    return cloudCategories;
  }
  if (!cloudCategories) {
    return localCategories;
  }

  // 比较 updateTime
  const localUpdateTime = localCategories.updateTime || 0;
  const cloudUpdateTime = cloudCategories.updateTime || 0;

  if (cloudUpdateTime > localUpdateTime) {
    return cloudCategories;
  }
  return localCategories;
}

/**
 * 合并设置数据
 */
function mergeSettings(localSettings, cloudSettings) {
  if (!localSettings && !cloudSettings) {
    return null;
  }
  if (!localSettings) {
    return cloudSettings;
  }
  if (!cloudSettings) {
    return localSettings;
  }

  // 比较 updateTime
  const localUpdateTime = localSettings.updateTime || 0;
  const cloudUpdateTime = cloudSettings.updateTime || 0;

  if (cloudUpdateTime > localUpdateTime) {
    return cloudSettings;
  }
  return localSettings;
}

/**
 * 同步本地多出的数据到云端（新增或更新）
 */
async function syncLocalExtraToCloud(localData, cloudData, collectionName, idField) {
  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    const cloudMap = new Map();

    // 建立云端数据的 map（只包含当前用户的数据）
    for (const item of cloudData) {
      cloudMap.set(item[idField], item);
    }

    // 需要过滤的系统字段
    const systemFields = ['_id', '_openid', '_createTime', '_updateTime'];

    for (const localItem of localData) {
      const id = localItem[idField];
      if (cloudMap.has(id)) {
        // 云端已有（属于当前用户），检查是否需要更新
        const cloudItem = cloudMap.get(id);
        const localUpdateTime = localItem.updateTime || localItem.createTime || 0;
        const cloudUpdateTime = cloudItem.updateTime || cloudItem.createTime || 0;

        if (localUpdateTime > cloudUpdateTime) {
          // 本地更新，用本地更新云端，需要过滤掉系统字段
          const updateData = {};
          for (const key in localItem) {
            if (!systemFields.includes(key)) {
              updateData[key] = localItem[key];
            }
          }
          await db.collection(collectionName).doc(cloudItem._id).update({
            data: updateData
          });
        }
        // 否则云端更新，不需要处理
      } else {
        // 云端没有，新增
        // 先检查云端是否已有相同 id 的数据（属于其他用户的）
        const existingRes = await db.collection(collectionName).where({
          id: id
        }).get();

        const addData = {};
        for (const key in localItem) {
          if (!systemFields.includes(key)) {
            addData[key] = localItem[key];
          }
        }

        if (existingRes.data && existingRes.data.length > 0) {
          // 云端已存在相同 id 的数据（可能是其他用户的），跳过或更新
          // 这里选择跳过，因为可能是脏数据
          console.log(`${collectionName} 中已存在 id=${id} 的数据，跳过同步`);
        } else {
          // 云端没有，新增
          await db.collection(collectionName).add({
            data: addData
          });
        }
      }
    }
  } catch (err) {
    // 如果是唯一索引冲突（其他用户的相同 id），忽略错误
    if (err.message && err.message.includes('duplicate key')) {
      console.log(`${collectionName} 同步时遇到重复 id，跳过`);
      return;
    }
    console.error(`同步本地多出的${collectionName}到云端失败`, err);
  }
}

/**
 * 同步账本到云端（新增或更新）
 */
async function syncAccountToCloud(account) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    // 先查询是否已存在（只查询当前用户的数据）
    const res = await db.collection('accounts').where({
      _openid: openid,
      id: account.id
    }).get();

    if (res.data && res.data.length > 0) {
      // 已存在，更新
      await db.collection('accounts').doc(res.data[0]._id).update({
        data: {
          name: account.name,
          updateTime: account.updateTime
        }
      });
    } else {
      // 不存在，新增
      // 先检查是否已有相同 id 的数据（可能是其他用户的）
      const existingRes = await db.collection('accounts').where({
        id: account.id
      }).get();

      if (existingRes.data && existingRes.data.length > 0) {
        console.log('账本 id 已存在，跳过同步');
        return;
      }

      await db.collection('accounts').add({
        data: {
          id: account.id,
          name: account.name,
          createTime: account.createTime,
          updateTime: account.updateTime
        }
      });
    }
  } catch (err) {
    // 如果是唯一索引冲突，忽略
    if (err.message && err.message.includes('duplicate key')) {
      console.log('账本同步遇到重复 id，跳过');
      return;
    }
    console.error('同步账本到云端失败', err);
  }
}

/**
 * 从云端删除账本
 */
async function deleteAccountFromCloud(accountId) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    const res = await db.collection('accounts').where({
      _openid: openid,
      id: accountId
    }).get();

    if (res.data && res.data.length > 0) {
      await db.collection('accounts').doc(res.data[0]._id).remove();
    }
  } catch (err) {
    console.error('从云端删除账本失败', err);
  }
}

/**
 * 同步账单到云端（新增或更新）
 */
async function syncBillToCloud(bill) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    // 先查询是否已存在（只查询当前用户的数据）
    const res = await db.collection('bills').where({
      _openid: openid,
      id: bill.id
    }).get();

    if (res.data && res.data.length > 0) {
      // 已存在，更新
      await db.collection('bills').doc(res.data[0]._id).update({
        data: {
          accountId: bill.accountId,
          date: bill.date,
          amount: bill.amount,
          type: bill.type,
          categoryId: bill.categoryId,
          remark: bill.remark,
          updateTime: bill.updateTime
        }
      });
    } else {
      // 不存在，新增
      // 先检查是否已有相同 id 的数据（可能是其他用户的）
      const existingRes = await db.collection('bills').where({
        id: bill.id
      }).get();

      if (existingRes.data && existingRes.data.length > 0) {
        console.log('账单 id 已存在，跳过同步');
        return;
      }

      await db.collection('bills').add({
        data: {
          id: bill.id,
          accountId: bill.accountId,
          date: bill.date,
          amount: bill.amount,
          type: bill.type,
          categoryId: bill.categoryId,
          remark: bill.remark,
          createTime: bill.createTime,
          updateTime: bill.updateTime
        }
      });
    }
  } catch (err) {
    // 如果是唯一索引冲突，忽略
    if (err.message && err.message.includes('duplicate key')) {
      console.log('账单同步遇到重复 id，跳过');
      return;
    }
    console.error('同步账单到云端失败', err);
  }
}

/**
 * 从云端删除账单
 */
async function deleteBillFromCloud(billId) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    // 查询并删除（只查询当前用户的数据）
    const res = await db.collection('bills').where({
      _openid: openid,
      id: billId
    }).get();

    if (res.data && res.data.length > 0) {
      await db.collection('bills').doc(res.data[0]._id).remove();
    }
  } catch (err) {
    console.error('从云端删除账单失败', err);
  }
}

/**
 * 从云端删除指定账本的所有账单
 */
async function deleteBillsByAccountFromCloud(accountId) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    // 查询该账本的所有账单（只查询当前用户的）
    const res = await db.collection('bills').where({
      _openid: openid,
      accountId: accountId
    }).get();

    // 逐个删除
    for (const item of res.data) {
      await db.collection('bills').doc(item._id).remove();
    }
  } catch (err) {
    console.error('从云端删除账本账单失败', err);
  }
}

/**
 * 从云端删除指定类别的所有账单
 */
async function deleteBillsByCategoryFromCloud(categoryId) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    // 查询该类别的所有账单（只查询当前用户的）
    const res = await db.collection('bills').where({
      _openid: openid,
      categoryId: categoryId
    }).get();

    // 逐个删除
    for (const item of res.data) {
      await db.collection('bills').doc(item._id).remove();
    }
  } catch (err) {
    console.error('从云端删除类别账单失败', err);
  }
}

/**
 * 同步分类到云端
 */
async function syncCategoriesToCloud(categories) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    // 查询当前用户的分类数据
    const res = await db.collection('categories').where({
      _openid: openid
    }).get();

    if (res.data && res.data.length > 0) {
      await db.collection('categories').doc(res.data[0]._id).update({
        data: {
          data: categories,
          updateTime: categories.updateTime || Date.now()
        }
      });
    } else {
      await db.collection('categories').add({
        data: {
          data: categories,
          updateTime: categories.updateTime || Date.now()
        }
      });
    }
  } catch (err) {
    console.error('同步分类到云端失败', err);
  }
}

/**
 * 同步设置到云端
 */
async function syncSettingsToCloud(settings) {
  if (!isCloudEnabled()) return;

  try {
    const db = getDb();
    if (!db) return;

    // 获取当前用户的 openid
    const openid = await getOpenId();
    if (!openid) return;

    // 查询当前用户的设置
    const res = await db.collection('settings').where({
      _openid: openid
    }).get();

    if (res.data && res.data.length > 0) {
      // 更新
      await db.collection('settings').doc(res.data[0]._id).update({
        data: {
          data: settings,
          updateTime: settings.updateTime || Date.now()
        }
      });
    } else {
      // 添加
      await db.collection('settings').add({
        data: {
          data: settings,
          updateTime: settings.updateTime || Date.now()
        }
      });
    }
  } catch (err) {
    console.error('同步设置到云端失败', err);
  }
}

/**
 * 检查是否首次使用（云端没有数据）
 */
async function isFirstTimeUse() {
  if (!isCloudEnabled()) return false;

  try {
    const db = getDb();
    if (!db) return false;

    const accountsRes = await db.collection('accounts').count();
    return accountsRes.total === 0;
  } catch (err) {
    console.error('检查首次使用失败', err);
    return false;
  }
}

module.exports = {
  isCloudEnabled,
  initCloud,
  getDb,
  getOpenId,
  syncFromCloud,
  syncAccountToCloud,
  deleteAccountFromCloud,
  syncBillToCloud,
  deleteBillFromCloud,
  deleteBillsByAccountFromCloud,
  deleteBillsByCategoryFromCloud,
  syncCategoriesToCloud,
  syncSettingsToCloud,
  isFirstTimeUse
};