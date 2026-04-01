#!/usr/bin/env node
/**
 * Converts the Chinese accountant brief to Word (.docx) and creates a tax summary spreadsheet (.xlsx)
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  Header, Footer, PageNumber, NumberFormat
} from 'docx';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const BUNDLE = 'C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle';
const MD_FILE = path.join(BUNDLE, '给会计师的最终报告.md');
const DOCX_OUT = path.join(BUNDLE, '给会计师的最终报告.docx');
const XLSX_OUT = path.join(BUNDLE, '2025_Tax_Summary.xlsx');

// ──────────────────────────────────────────────────
// DOCX Generation
// ──────────────────────────────────────────────────

function mdToDocx(mdContent) {
  const lines = mdContent.split('\n');
  const children = [];

  let inTable = false;
  let tableRows = [];
  let tableHeaders = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const rows = [];
    // Header row
    if (tableHeaders.length > 0) {
      rows.push(new TableRow({
        tableHeader: true,
        children: tableHeaders.map(h => new TableCell({
          shading: { type: ShadingType.SOLID, color: 'D97757' },
          children: [new Paragraph({
            children: [new TextRun({ text: h.trim(), bold: true, color: 'FFFFFF', font: 'Microsoft YaHei', size: 20 })],
            alignment: AlignmentType.CENTER,
          })],
          width: { size: Math.floor(9000 / tableHeaders.length), type: WidthType.DXA },
        })),
      }));
    }
    // Data rows
    for (const row of tableRows) {
      rows.push(new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell.trim(), font: 'Microsoft YaHei', size: 18 })],
          })],
          width: { size: Math.floor(9000 / Math.max(row.length, 1)), type: WidthType.DXA },
        })),
      }));
    }
    if (rows.length > 0) {
      children.push(new Table({
        rows,
        width: { size: 9000, type: WidthType.DXA },
      }));
      children.push(new Paragraph({ children: [] })); // spacer
    }
    tableRows = [];
    tableHeaders = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith('|') && line.includes('|')) {
      const cells = line.split('|').filter(c => c.trim() !== '');
      // Check if separator row
      if (cells.every(c => /^[\s-:]+$/.test(c))) continue;

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: line.replace(/^# /, ''), font: 'Microsoft YaHei', size: 32, bold: true, color: 'D97757' })],
        spacing: { before: 400, after: 200 },
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: line.replace(/^## /, ''), font: 'Microsoft YaHei', size: 28, bold: true, color: '333333' })],
        spacing: { before: 360, after: 120 },
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: line.replace(/^### /, ''), font: 'Microsoft YaHei', size: 24, bold: true, color: '555555' })],
        spacing: { before: 240, after: 80 },
      }));
    }
    // Bold lines
    else if (line.startsWith('**') && line.endsWith('**')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/\*\*/g, ''), font: 'Microsoft YaHei', size: 20, bold: true })],
        spacing: { before: 80, after: 40 },
      }));
    }
    // List items
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const text = line.trim().replace(/^[-*] /, '');
      // Handle **bold** within list items
      const parts = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIdx = 0;
      let match;
      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          parts.push(new TextRun({ text: text.substring(lastIdx, match.index), font: 'Microsoft YaHei', size: 20 }));
        }
        parts.push(new TextRun({ text: match[1], font: 'Microsoft YaHei', size: 20, bold: true }));
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < text.length) {
        parts.push(new TextRun({ text: text.substring(lastIdx), font: 'Microsoft YaHei', size: 20 }));
      }
      children.push(new Paragraph({
        children: parts.length > 0 ? parts : [new TextRun({ text, font: 'Microsoft YaHei', size: 20 })],
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
      }));
    }
    // Code blocks
    else if (line.startsWith('```')) {
      // Skip code fence lines, just render content as monospace
      continue;
    }
    // Horizontal rule
    else if (line.trim() === '---') {
      children.push(new Paragraph({
        children: [new TextRun({ text: '─'.repeat(60), font: 'Consolas', size: 16, color: 'CCCCCC' })],
        spacing: { before: 120, after: 120 },
      }));
    }
    // Regular text
    else if (line.trim() !== '') {
      const parts = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIdx = 0;
      let match;
      const text = line.trim();
      while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          parts.push(new TextRun({ text: text.substring(lastIdx, match.index), font: 'Microsoft YaHei', size: 20 }));
        }
        parts.push(new TextRun({ text: match[1], font: 'Microsoft YaHei', size: 20, bold: true }));
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < text.length) {
        parts.push(new TextRun({ text: text.substring(lastIdx), font: 'Microsoft YaHei', size: 20 }));
      }
      if (parts.length > 0) {
        children.push(new Paragraph({ children: parts, spacing: { before: 40, after: 40 } }));
      }
    }
  }
  // Flush any remaining table
  flushTable();

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: '2025年度报税资料 — Homen Shum / CafeCorner LLC', font: 'Microsoft YaHei', size: 16, color: '999999' })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '第 ', font: 'Microsoft YaHei', size: 16, color: '999999' }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Microsoft YaHei', size: 16, color: '999999' }),
              new TextRun({ text: ' 页', font: 'Microsoft YaHei', size: 16, color: '999999' }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return doc;
}

// ──────────────────────────────────────────────────
// XLSX Generation
// ──────────────────────────────────────────────────

function generateXlsx() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Income Summary
  const incomeData = [
    ['2025年收入汇总 / 2025 Income Summary'],
    [],
    ['来源 / Source', '类型 / Type', 'Form', '金额 / Amount', '预扣税 / Tax Withheld', '备注 / Notes'],
    ['IdeaFlow Inc', '独立承包商 / 1099 Contractor', '1099-NEC', 32400.00, 0, '2025年5月-10月 / May-Oct 2025'],
    ['Tests Assured, Inc.', '独立承包商 / 1099 Contractor', '1099 (via Rippling)', 10904.00, 0, '2025年11月-12月 / Nov-Dec 2025'],
    ['Roth IRA 提款 / Withdrawal', '原始供款退回 / Return of contributions', 'N/A (免税/Tax-free)', 20000.00, 0, 'IRC §408A(d)(4)(A) — 不计入收入 / Not taxable'],
    [],
    ['应税收入合计 / Total Taxable Income', '', '', 43304.00, 0, '仅 IdeaFlow + Tests Assured'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(incomeData);
  ws1['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, '收入 Income');

  // Sheet 2: Schedule C Expenses
  const expenseData = [
    ['Schedule C 营业费用明细 / Business Expenses'],
    [],
    ['行号 / Line', '类别 / Category', '2023年', '2024年', '2025年(预估)', '备注 / Notes'],
    ['1', '营业收入 / Revenue', 9000, 3500, 43304, 'IdeaFlow + Tests Assured'],
    ['9', '汽车费用 / Car & Truck', 2161, 0, '2,000-4,000', '全部Chase加油 = 商务用途'],
    ['13', '折旧 / Depreciation', 1600, 0, 3200, 'Mazda 5年MACRS第3年 (Keeper 2024年遗漏)'],
    ['15', '保险 / Insurance', 187, 43, '200-500', ''],
    ['22', '用品 / Supplies', 9152, 2153, '3,000-5,000', 'Amazon商务采购 (355笔订单)'],
    ['24a', '差旅 / Travel', 2155, 95, '1,500-2,500', '12月机票 + Uber/Lyft + ServiceNow出差'],
    ['24b', '餐饮 (50%) / Meals', 4000, 869, '3,000-5,000', '客户会议、黑客松、社交活动'],
    ['27a-1', '办公室租金 / Office Rent', 22300, 18423, '20,000-24,000', '全年房租 (Castro Valley→Fremont)'],
    ['27a-2', '软件订阅 / Software Subs', 1476, 495, '3,000-5,000', 'Anthropic, Convex, GitHub, Google Workspace x2, Stripe SaaS'],
    ['27a-3', '其他费用 / Other Expenses', 7524, 2667, '3,000-5,000', '网络、电话、LinkedIn Premium'],
    ['27a-4', '电话 / Phone', 37, 0, '600-1,200', 'Chase对账单中的手机账单'],
    ['27a-5', '交通 / Transportation', 320, 12, '500-1,000', 'Uber/Lyft商务出行、停车费'],
    ['27a-6', '执照费 / License Fees', 342, 50, '300-800', 'doola LLC年费、专业会员'],
    ['27a-7', '继续教育 / Education', 50, 16, '500-1,500', '7+黑客松报名费、课程'],
    [],
    ['28', '费用合计 / Total Expenses', 51358, 24823, '45,000-55,000', ''],
    ['31', '净利润(亏损) / Net Profit (Loss)', -42358, -21323, '($2,000)-($12,000)', ''],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(expenseData);
  ws2['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws2, '费用 Expenses');

  // Sheet 3: QBI Loss Carryforward
  const qbiData = [
    ['QBI 亏损结转计算 / QBI Loss Carryforward'],
    [],
    ['年份 / Year', 'Schedule C 亏损', '当年QBI亏损', '累计结转 (正确)', '累计结转 (Keeper报的)', '差异'],
    ['2023', -42358, -42358, -42358, -42358, 0],
    ['2024', -21323, -21323, -63681, -21323, -42358],
    ['2025 (预估)', '-2K to -12K', '-2K to -12K', '-65K to -76K', '-23K to -33K', '-42,358'],
    [],
    ['⚠️ Keeper Tax 遗漏了2023年的$42,358 QBI亏损结转到2024年'],
    ['建议: 修正2024年报税 (1040-X) 或在2025年Form 8995 Line 3中补报$63,681'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(qbiData);
  ws3['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'QBI亏损结转');

  // Sheet 4: Health Insurance
  const healthData = [
    ['健康保险 / Health Insurance — Covered California'],
    [],
    ['项目 / Item', '金额 / Amount', '备注 / Notes'],
    ['保险计划 / Plan', 'Kaiser Silver 87 HMO', 'Covered California'],
    ['保障期间 / Coverage', '2025/01/01 - 2025/12/31', '全年'],
    ['月保费 / Monthly Premium', '$470.43', ''],
    ['APTC补贴 / Subsidy', '$469.43/月', '每月预付税收抵免'],
    ['个人月付 / Your Cost', '$1.00/月', '$12/年'],
    ['全年APTC总额 / Annual APTC', '$5,633', '需要用1095-A核对 (Form 8962)'],
    ['自付费用 / Out-of-Pocket', '$80.00', '截至2025年11月30日'],
    ['医疗账单 / Medical Bills', '$100.00', '$35 + $65 (Kaiser bills)'],
    [],
    ['⚠️ 必须从coveredca.com下载Form 1095-A才能报税'],
    ['如果AGI低于联邦贫困线 ($15,060), APTC无需偿还'],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(healthData);
  ws4['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws4, '健康保险 Health');

  // Sheet 5: Deductions Summary
  const deductionData = [
    ['扣除项目汇总 / Deductions Summary'],
    [],
    ['扣除项 / Deduction', '金额 / Amount', 'Form/Line', '类型 / Type'],
    ['学生贷款利息 / Student Loan Interest', 476.67, '1098-E → Schedule 1 Line 21', 'Above-the-line'],
    ['SE税50%扣除 / 50% SE Tax', '0-2,500', 'Schedule 1 Line 15', 'Above-the-line'],
    ['自雇健康保险 / Self-employed Health Ins.', 12, 'Schedule 1 Line 17', 'Above-the-line'],
    ['标准扣除 / Standard Deduction', 15000, '1040 Line 12', 'Standard'],
    ['QBI亏损结转 / QBI Loss Carryforward', 63681, 'Form 8995 Line 3', 'QBI (修正后)'],
    [],
    ['车辆折旧 / Vehicle Depreciation'],
    ['年份 / Year', '折旧额 / Depreciation', '累计 / Cumulative', '备注'],
    ['2023 (第1年)', '$1,600', '$1,600', 'Mazda $32K, 50%商务, MACRS半年'],
    ['2024 (第2年)', '$3,200 (遗漏)', '$4,800', 'Keeper Tax 未申报'],
    ['2025 (第3年)', '$3,200', '$8,000', '必须继续申报'],
    ['2026 (第4年)', '$3,200', '$11,200', ''],
    ['2027 (第5年)', '$3,200', '$14,400', ''],
    ['2028 (第6年)', '$1,600', '$16,000', '半年惯例'],
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(deductionData);
  ws5['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, ws5, '扣除 Deductions');

  // Sheet 6: Tax Estimate
  const taxData = [
    ['预估税务结果 / Estimated Tax Outcome'],
    [],
    ['情景 / Scenario', '费用', 'Schedule C净额', 'AGI', '联邦税', 'SE税', 'APTC偿还', '合计'],
    ['最佳 / Best', '$50,000+', '亏损', '~$0', '$0', '$0', '$0', '$0'],
    ['中间 / Middle', '$45,000', '$0-$3,000', '~$3,000', '$0', '$0-$350', '$0-$375', '$0-$700'],
    ['最差 / Worst', '$35,000', '$8,000', '~$8,000', '$0', '~$1,200', '~$950', '~$2,200'],
    [],
    ['所有情景下联邦所得税均为$0 (标准扣除$15,000 > 应税收入)'],
    ['唯一变量: SE税 + APTC偿还金额, 取决于Schedule C最终净额'],
  ];
  const ws6 = XLSX.utils.aoa_to_sheet(taxData);
  ws6['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws6, '预估 Estimate');

  // Sheet 7: Action Items
  const actionData = [
    ['待办事项 / Action Items'],
    [],
    ['优先级', '项目 / Item', '来源 / Where', '状态 / Status'],
    ['P0', 'Form 1095-A (Covered California)', 'coveredca.com → Tax Forms', '❌ 未完成'],
    ['P0', 'Tests Assured 1099-NEC (确认$10,904)', 'Rippling 或等待邮寄', '❌ 未完成'],
    ['P0', 'Chase对账单 — 汇总加油费', 'chase.com → 下载CSV', '❌ 未完成'],
    ['P0', 'Chase对账单 — 汇总餐饮费', '同上 — 标注商务目的', '❌ 未完成'],
    ['P1', 'Schwab 1099-R (Roth提款文件)', 'Schwab Tax Center', '❌ 未完成'],
    ['P1', '12个月房租收据', 'Bilt Rewards 或 Chase对账单', '❌ 未完成'],
    ['P1', '网络/电话账单年度总额', '运营商门户或Chase对账单', '❌ 未完成'],
    ['P2', '审查2024年是否需要修正 (1040-X)', '会计师决定', '待讨论'],
    ['P2', 'Farmers Insurance火灾理赔信', '实体邮件或致电Farmers', '❌ 未完成'],
  ];
  const ws7 = XLSX.utils.aoa_to_sheet(actionData);
  ws7['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 30 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws7, '待办 Actions');

  // Sheet 8: Document Inventory
  const docData = [
    ['文件清单 / Document Inventory'],
    [],
    ['文件夹 / Folder', '文件数', '内容描述 / Description'],
    ['1-Income/', 16, '1099-NEC ($32,400), 3份Tests Assured工资单, IdeaFlow合同/NDA/5份工时表, Schwab Roth文件, Rippling工资单'],
    ['2-Business-Expenses/', 177, '154份SaaS发票/收据 (Anthropic, Convex, GitHub, Stripe), 12份水电账单, 11份订单/机票'],
    ['3-Health-Insurance/', 11, 'Covered CA注册确认, Kaiser医疗账单x2, EOBx3, 费用累计信, 费率更新信'],
    ['4-Deductions/', 1, 'Nelnet 1098-E ($476.67学生贷款利息)'],
    ['5-Prior-Returns/', 4, '2023+2024 Keeper Tax报税, 2023 JPM W-2'],
    ['6-Reference/', 35, 'Gmail扫描数据, Gemini AI提取结果'],
    [],
    ['总计: 459份文件 + 5份分析报告'],
  ];
  const ws8 = XLSX.utils.aoa_to_sheet(docData);
  ws8['!cols'] = [{ wch: 22 }, { wch: 8 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws8, '文件清单 Files');

  return wb;
}

// ──────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────

async function main() {
  console.log('Generating Word document and Excel spreadsheet...\n');

  // Generate DOCX
  const mdContent = fs.readFileSync(MD_FILE, 'utf8');
  const doc = mdToDocx(mdContent);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(DOCX_OUT, buffer);
  console.log(`[DOCX] ${DOCX_OUT} (${(buffer.length / 1024).toFixed(0)}KB)`);

  // Generate XLSX
  const wb = generateXlsx();
  XLSX.writeFile(wb, XLSX_OUT);
  const xlsxSize = fs.statSync(XLSX_OUT).size;
  console.log(`[XLSX] ${XLSX_OUT} (${(xlsxSize / 1024).toFixed(0)}KB)`);

  console.log('\nDone! Both files saved to the tax bundle folder.');
}

main().catch(e => { console.error(e); process.exit(1); });
