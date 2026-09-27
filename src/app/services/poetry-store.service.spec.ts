import { TestBed } from '@angular/core/testing';
import { PoetryStoreService } from './poetry-store.service';

describe('PoetryStoreService 押韵核对', () => {
  let store: PoetryStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(PoetryStoreService);
  });

  const setRhyme = (line: number, position: number, group: string): void => {
    store.selectCell(line, position);
    store.setMark({ rhyme: group });
  };
  const setLineText = (line: number, text: string): void => {
    const lines = store.lines().slice();
    lines[line] = text;
    store.updateText(lines.join('\n'));
  };

  it('同属一个韵部时通过，不报落韵与重韵', () => {
    const report = store.rhymeReport();
    expect(report.groups).toEqual(['A']);
    expect(report.mixed).toBeFalse();
    expect(report.offRhymes).toHaveSize(0);
    expect(report.repeatedChars).toHaveSize(0);
  });

  it('出现两种韵部时逐句标出落韵，并给出主韵', () => {
    store.setTemplate('wuyan-pingqi'); // 押韵句 1/2/4，默认全 A
    setRhyme(1, 4, 'B'); // 第 2 句韵脚改填 B
    const report = store.rhymeReport();
    expect(report.mixed).toBeTrue();
    expect(report.groups).toEqual(['A', 'B']);
    expect(report.mainGroup).toBe('A');
    expect(report.offRhymes).toHaveSize(1);
    expect(report.offRhymes[0].line).toBe(1);
    expect(report.offRhymes[0].char).toBe('鸟');
    const offIssue = store.issues().find((issue) => issue.id === 'rhyme-off-1');
    expect(offIssue?.position).toBe(4);
  });

  it('同一字在两处韵脚重复、即使韵部标签不同也单独提示', () => {
    store.setTemplate('wuyan-pingqi');
    setRhyme(1, 4, 'B'); // 第 2 句鸟=B
    setLineText(3, '花落知多鸟。');
    setRhyme(3, 4, 'A'); // 第 4 句鸟=A
    const repeated = store.rhymeReport().repeatedChars.find((entry) => entry.char === '鸟');
    expect(repeated?.feet.map((foot) => foot.line)).toEqual([1, 3]);
    expect(store.issues().some((issue) => issue.id.startsWith('rhyme-repeat-'))).toBeTrue();
  });

  it('同一字同韵部重复同样提示，不因标签一致而漏掉', () => {
    store.setTemplate('wuyan-pingqi');
    setLineText(3, '花落知多鸟。');
    const repeated = store.rhymeReport().repeatedChars.find((entry) => entry.char === '鸟');
    expect(repeated).toBeTruthy();
    expect(store.rhymeReport().mixed).toBeFalse();
  });

  it('未填韵部的押韵句逐句提示', () => {
    setRhyme(1, 4, ''); // 默认仄起模板押韵句 2/4
    expect(store.rhymeReport().missing.map((foot) => foot.line)).toContain(1);
    expect(store.issues().some((issue) => issue.id === 'rhyme-missing-1')).toBeTrue();
  });

  it('导出稿包含逐字标注、押韵核对、对仗关系与全部检查结论', () => {
    const md = store.exportProofreadCopy();
    expect(md).toContain('逐字标注');
    expect(md).toContain('押韵核对');
    expect(md).toContain('对仗关系');
    expect(md).toContain('检查结论');
    for (const column of ['平仄', '韵组', '停顿', '判断依据', '批注']) {
      expect(md).toContain(column);
    }
  });
});
