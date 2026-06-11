// pages/guide/guide.js
const guide = require('../../utils/guide.js');
const theme = require('../../utils/theme.js');

Page({
  data: {
    nodes: []
  },

  onLoad() {
    const nodes = this.parseMarkdown(guide.guideContent);
    this.setData({ nodes });
    this.applyTheme();
  },

  onShow() {
    this.applyTheme();
  },

  // 应用主题
  applyTheme() {
    theme.applyThemeToPage(this);
  },

  // 简单Markdown解析函数
  parseMarkdown(text) {
    const lines = text.split('\n');
    const nodes = [];
    let inTable = false;
    let tableRows = [];
    let inList = false;
    let listItems = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimRight();

      // 空行 - 完全忽略所有空行
      if (!line) {
        if (inList) {
          nodes.push(this.createListNode(listItems));
          listItems = [];
          inList = false;
        }
        if (inTable) {
          nodes.push(this.createTableNode(tableRows));
          tableRows = [];
          inTable = false;
        }
        continue;
      }

      // 表格行
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
        }
        const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
        tableRows.push(cells);
        continue;
      }

      // 如果之前有表格，现在遇到非表格行，结束表格
      if (inTable) {
        nodes.push(this.createTableNode(tableRows));
        tableRows = [];
        inTable = false;
      }

      // 标题
      if (line.startsWith('# ')) {
        nodes.push({
          type: 'node',
          name: 'h1',
          attrs: { class: 'guide-h1' },
          children: this.processInlineFormatting(line.substring(2))
        });
        continue;
      }
      if (line.startsWith('## ')) {
        nodes.push({
          type: 'node',
          name: 'h2',
          attrs: { class: 'guide-h2' },
          children: this.processInlineFormatting(line.substring(3))
        });
        continue;
      }
      if (line.startsWith('### ')) {
        nodes.push({
          type: 'node',
          name: 'h3',
          attrs: { class: 'guide-h3' },
          children: this.processInlineFormatting(line.substring(4))
        });
        continue;
      }
      if (line.startsWith('#### ')) {
        nodes.push({
          type: 'node',
          name: 'h4',
          attrs: { class: 'guide-h4' },
          children: this.processInlineFormatting(line.substring(5))
        });
        continue;
      }

      // 分隔线：---、***、___
      if (line === '---' || line === '***' || line === '___') {
        nodes.push({
          type: 'node',
          name: 'hr',
          attrs: { class: 'guide-hr' }
        });
        continue;
      }

      // 无序列表
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) {
          inList = true;
        }
        listItems.push(line.substring(2));
        continue;
      }

      // 列表结束
      if (inList && !(line.startsWith('- ') || line.startsWith('* '))) {
        nodes.push(this.createListNode(listItems));
        listItems = [];
        inList = false;
      }

      // 普通段落
      if (!inList && !inTable) {
        // 处理行内格式：粗体、代码等
        const inlineNodes = this.processInlineFormatting(line);
        nodes.push({
          type: 'node',
          name: 'p',
          attrs: { class: 'guide-paragraph' },
          children: inlineNodes
        });
      }
    }

    // 处理末尾的列表或表格
    if (inList && listItems.length > 0) {
      nodes.push(this.createListNode(listItems));
    }
    if (inTable && tableRows.length > 0) {
      nodes.push(this.createTableNode(tableRows));
    }

    return nodes;
  },

  // 创建列表节点
  createListNode(items) {
    const children = items.map(item => ({
      type: 'node',
      name: 'li',
      attrs: { class: 'guide-list-item' },
      children: this.processInlineFormatting(item)
    }));

    return {
      type: 'node',
      name: 'ul',
      attrs: { class: 'guide-list' },
      children
    };
  },

  // 创建表格节点
  createTableNode(rows) {
    // 第一行作为表头
    const headerRow = rows[0] || [];
    const bodyRows = rows.slice(1);

    const headerChildren = headerRow.map(cell => ({
      type: 'node',
      name: 'th',
      attrs: { class: 'guide-table-th' },
      children: this.processInlineFormatting(cell)
    }));

    const header = {
      type: 'node',
      name: 'tr',
      attrs: { class: 'guide-table-tr' },
      children: headerChildren
    };

    const bodyChildren = bodyRows.map(row => {
      const cellChildren = row.map(cell => ({
        type: 'node',
        name: 'td',
        attrs: { class: 'guide-table-td' },
        children: this.processInlineFormatting(cell)
      }));
      return {
        type: 'node',
        name: 'tr',
        attrs: { class: 'guide-table-tr' },
        children: cellChildren
      };
    });

    return {
      type: 'node',
      name: 'table',
      attrs: { class: 'guide-table' },
      children: [
        {
          type: 'node',
          name: 'thead',
          children: [header]
        },
        {
          type: 'node',
          name: 'tbody',
          children: bodyChildren
        }
      ]
    };
  },

  // 处理行内格式：粗体、斜体、代码，返回节点数组
  processInlineFormatting(text) {
    const nodes = [];

    // 正则表达式匹配 **粗体**、*斜体*、_斜体_ 和 `代码`
    // 注意：* 和 ** 可能有冲突，需要特殊处理
    const boldRegex = /\*\*(.+?)\*\*/g;
    // 斜体：必须是单独的 *，不是 **
    const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
    const italicUnderRegex = /_(.+?)_/g;
    const codeRegex = /`(.+?)`/g;

    // 收集所有匹配的位置
    const matches = [];
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        type: 'bold',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1]
      });
    }

    // 斜体使用负向预查来避免匹配 ** 中的 *
    while ((match = italicRegex.exec(text)) !== null) {
      matches.push({
        type: 'italic',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1]
      });
    }

    while ((match = italicUnderRegex.exec(text)) !== null) {
      matches.push({
        type: 'italic',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1]
      });
    }

    while ((match = codeRegex.exec(text)) !== null) {
      matches.push({
        type: 'code',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1]
      });
    }

    // 按位置排序
    matches.sort((a, b) => a.start - b.start);

    // 构建节点
    let currentPos = 0;

    for (const match of matches) {
      // 添加匹配前的普通文本
      if (match.start > currentPos) {
        nodes.push({
          type: 'text',
          text: text.substring(currentPos, match.start)
        });
      }

      // 添加匹配的节点
      if (match.type === 'bold') {
        nodes.push({
          type: 'node',
          name: 'strong',
          attrs: { class: 'guide-strong' },
          children: [{ type: 'text', text: match.content }]
        });
      } else if (match.type === 'italic') {
        nodes.push({
          type: 'node',
          name: 'em',
          attrs: { class: 'guide-italic' },
          children: [{ type: 'text', text: match.content }]
        });
      } else if (match.type === 'code') {
        nodes.push({
          type: 'node',
          name: 'code',
          attrs: { class: 'guide-code' },
          children: [{ type: 'text', text: match.content }]
        });
      }

      currentPos = match.end;
    }

    // 添加剩余的普通文本
    if (currentPos < text.length) {
      nodes.push({
        type: 'text',
        text: text.substring(currentPos)
      });
    }

    // 如果没有匹配，返回整个文本作为文本节点
    if (nodes.length === 0 && text.length > 0) {
      nodes.push({
        type: 'text',
        text: text
      });
    }

    return nodes;
  }
});