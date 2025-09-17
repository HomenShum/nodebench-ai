import { describe, it, expect } from 'vitest';
import { markdownToBlocks, sanitizeBlocks, applyNodeOps, type EditorJsBlock, type EditorNodeAction } from '../lib/editorNodeOps';

const sampleBlocks = (texts: string[]): EditorJsBlock[] => texts.map(t => ({ type: 'paragraph', data: { text: t } }));

describe('editorNodeOps', () => {
  it('markdownToBlocks: paragraphs, headers, lists, delimiter', () => {
    const md = [
      '# Title',
      '',
      '- a',
      '- b',
      '',
      '1. x',
      '2. y',
      '',
      'plain',
      'text',
      '',
      '---',
    ].join('\n');
    const blocks = markdownToBlocks(md);
    expect(Array.isArray(blocks)).toBe(true);
    const types = blocks.map(b => b.type);
    expect(types).toContain('header');
    expect(types).toContain('list');
    expect(types).toContain('paragraph');
    expect(types).toContain('delimiter');
  });

  it('markdownToBlocks: fenced code returns a single code block', () => {
    const md = ['```', 'code here', '```'].join('\n');
    const blocks = markdownToBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    expect((blocks[0] as any).data.code).toContain('code here');
  });

  it('sanitizeBlocks: repairs invalid blocks and drops unknowns', () => {
    const dirty: any[] = [
      { type: 'paragraph', data: { text: 123 } },
      { type: 'header', data: { level: 99, text: 42 } },
      { type: 'list', data: { style: 'ordered', items: [1, 'two'] } },
      { type: 'unknown', data: { text: 'keep as paragraph' } },
      { noType: true },
    ];
    const clean = sanitizeBlocks(dirty);
    expect(clean.find(b => b.type === 'paragraph')).toBeTruthy();
    const header = clean.find(b => b.type === 'header');
    expect(header && (header as any).data.level).toBeLessThanOrEqual(6);
  });

  it('applyNodeOps: createNode after anchor', () => {
    const blocks = sampleBlocks(['A', 'B', 'C']);
    const actions: EditorNodeAction[] = [
      { type: 'createNode', position: 'after', markdown: 'D' },
    ];
    const result = applyNodeOps(blocks, actions, { anchorIndex: 1 });
    expect(result.map(b => b.data.text)).toEqual(['A', 'B', 'D', 'C']);
  });

  it('applyNodeOps: createNode before anchor', () => {
    const blocks = sampleBlocks(['A', 'B']);
    const actions: EditorNodeAction[] = [
      { type: 'createNode', position: 'before', markdown: 'X' },
    ];
    const result = applyNodeOps(blocks, actions, { anchorIndex: 1 });
    expect(result.map(b => b.data.text)).toEqual(['A', 'X', 'B']);
  });

  it('applyNodeOps: createNode at start/end', () => {
    const blocks = sampleBlocks(['A']);
    const startRes = applyNodeOps(blocks, [{ type: 'createNode', position: 'start', markdown: 'S' }], { anchorIndex: 0 });
    expect(startRes.map(b => b.data.text)).toEqual(['S', 'A']);
    const endRes = applyNodeOps(blocks, [{ type: 'createNode', position: 'end', markdown: 'E' }], { anchorIndex: 0 });
    expect(endRes.map(b => b.data.text)).toEqual(['A', 'E']);
  });

  it('applyNodeOps: updateNode replaces single with multiple', () => {
    const blocks = sampleBlocks(['A', 'B', 'C']);
    const actions: EditorNodeAction[] = [
      { type: 'updateNode', targetIndex: 1, markdown: 'X\n\nY' },
    ];
    const result = applyNodeOps(blocks, actions, { anchorIndex: 0 });
    expect(result.map(b => b.data.text)).toEqual(['A', 'X', 'Y', 'C']);
  });

  it('applyNodeOps: deleteNode removes target', () => {
    const blocks = sampleBlocks(['A', 'B', 'C']);
    const result = applyNodeOps(blocks, [{ type: 'deleteNode', targetIndex: 1 }], { anchorIndex: 0 });
    expect(result.map(b => b.data.text)).toEqual(['A', 'C']);
  });

  it('applyNodeOps: replaceRange', () => {
    const blocks = sampleBlocks(['A', 'B', 'C', 'D']);
    const actions: EditorNodeAction[] = [
      { type: 'replaceRange', startIndex: 1, endIndex: 3, markdown: 'X\n\nY' },
    ];
    const result = applyNodeOps(blocks, actions, { anchorIndex: 0 });
    expect(result.map(b => b.data.text)).toEqual(['A', 'X', 'Y', 'D']);
  });
});
