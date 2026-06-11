# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**小沐账本 (mmjz)** - A native WeChat mini-program for personal bookkeeping. No login required, all data stored locally on the device.

## Development Commands

```bash
# Open in WeChat Developer Tools
# Just import the project directory in WeChat Developer Tools

# No build/lint/test commands - native mini-program uses WeChat DevTools
```

## Architecture

### Pages (4 main tabs)
- **pages/detail/** - Bill list with filter by account/month
- **pages/chart/** - Pie charts (expense/income ratios) + bar charts (monthly trends) using Canvas
- **pages/add/** - Quick add bill with category grid, amount input, date/account selection
- **pages/mine/** - Settings: theme, accounts, categories, import/export

### Data Model (stored via wx.getStorageSync)
- `accounts[]` - [{id, name, createTime}]
- `currentAccount` - Current account ID
- `categories` - {expense: [{id, name, icon}], income: [{id, name, icon}]}
- `bills[]` - [{id, accountId, date, amount, type, categoryId, remark, createTime}]
- `settings` - {theme}

### Key Utilities
- **utils/storage.js** - All data operations (CRUD for accounts, categories, bills, settings)
- **utils/theme.js** - Theme definitions (simple, dark, male, female, cute) + `applyThemeToPage(page)` helper
- **utils/excel.js** - CSV import/export, validation, error reporting

### Theme System
Themes are defined in `utils/theme.js` with color schemes. Apply to any page by calling `theme.applyThemeToPage(this)` in `onLoad`, which also sets navigation bar colors via `wx.setNavigationBarColor()`.

### Tab Bar
Custom tab bar in `custom-tab-bar/` with 4 tabs. Theme-aware colors stored in `wx.setStorageSync('currentTheme', themeName)`.

## Important Patterns

- **ID generation**: `app.generateId()` returns `'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)`
- **Date formatting**: `storage.formatDate(timestamp, format)` supports YYYY-MM-DD, HH:mm
- **Bill dates**: Stored as timestamps, filtered via `getBillsByDateRange(accountIds, startDate, endDate)`
- **Canvas charts**: Use `wx.createCanvasContext` in `pages/chart/chart.js` for pie/bar visualization

## App ID

`wx5fb7f55e60c13525` (configured in project.config.json)