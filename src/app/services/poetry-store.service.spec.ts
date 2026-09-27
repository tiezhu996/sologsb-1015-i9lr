import { TestBed } from '@angular/core/testing';
import { PoetryStoreService } from './poetry-store.service';

describe('PoetryStoreService 韵部核对与导出', () => {
  let service: PoetryStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoetryStoreService);
  });

  const setRhyme = (line: number, position: number, rhyme: string) => {
    service.selectCell(line, position);
    service.setMark({ rhyme });
  };

  it('默认稿各押韵句同属一部，不报韵部不一', () => {
    expect(service.issues().some((issue) => issue.title === '押韵句韵部不一')).toBeFalse();
    expect(service.issues().some((issue) => issue.title === '重复用韵')).toBeFalse();
  });

  it('押韵句填了不同韵部时逐句标出落韵，并写明句序与韵部', () => {
    setRhyme(1, 4, 'A');
    setRhyme(3, 4, 'B');
    const issues = service.issues();

    const summary = issues.find((issue) => issue.title === '押韵句韵部不一');
    expect(summary).toBeTruthy();
    expect(summary!.level).toBe('error');
    expect(summary!.detail).toContain('A');
    expect(summary!.detail).toContain('B');
    expect(summary!.detail).toContain('第 2 句');
    expect(summary!.detail).toContain('第 4 句');
    expect(summary!.line).toBe(3);
    expect(summary!.position).toBe(4);

    const perLine = issues.filter((issue) => issue.title.startsWith('落韵核对'));
    expect(perLine.length).toBe(2);
    expect(perLine.map((issue) => issue.line)).toEqual([1, 3]);
    perLine.forEach((issue) => expect(issue.position).toBe(4));
    expect(issues.some((issue) => issue.title === '格律检查通过')).toBeFalse();
  });

  it('同一个字重复作韵脚，即使韵部标签不同也单独提示', () => {
    service.updateText('春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多鸟。');
    setRhyme(1, 4, 'A');
    setRhyme(3, 4, 'B');
    const duplicate = service.issues().find((issue) => issue.title === '重复用韵');
    expect(duplicate).toBeTruthy();
    expect(duplicate!.detail).toContain('鸟');
    expect(duplicate!.detail).toContain('第 2 句');
    expect(duplicate!.detail).toContain('第 4 句');
    expect(duplicate!.line).toBe(3);
    expect(duplicate!.position).toBe(4);
  });

  it('韵脚缺韵部时按句序提示并可定位到韵脚字', () => {
    setRhyme(1, 4, '');
    const missing = service.issues().find((issue) => issue.title === '韵脚缺少韵部');
    expect(missing).toBeTruthy();
    expect(missing!.detail).toContain('第 2 句');
    expect(missing!.line).toBe(1);
    expect(missing!.position).toBe(4);
  });

  it('导出校对稿包含逐字标注、落韵、对仗与全部检查结论', () => {
    service.selectCell(0, 0);
    service.addAntithesis();
    setRhyme(1, 4, 'A');
    service.setMark({ pauseAfter: true, basis: '《平水韵》上声十七筱', note: '校勘批注' });
    const output = service.exportProofreadCopy();

    expect(output).toContain('## 一、逐字标注');
    expect(output).toContain('| 位 | 字 | 平仄 | 应合 | 校勘状态 | 韵组 | 停顿 | 依据 | 批注 |');
    expect(output).toContain('《平水韵》上声十七筱');
    expect(output).toContain('校勘批注');
    expect(output).toContain('顿');
    expect(output).toContain('## 二、韵脚落韵');
    expect(output).toContain('## 三、对仗关系');
    expect(output).toContain('第 1 句 ↔ 第 2 句');
    expect(output).toContain('## 四、检查结论');
    expect(output).toContain('【');
  });
});
