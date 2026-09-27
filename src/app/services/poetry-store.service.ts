import { computed, Injectable, signal } from '@angular/core';
import type {
  AnalysisCell,
  AnalysisLine,
  CharacterMark,
  CharDiff,
  MarkTone,
  MeterTemplate,
  PoemIssue,
  PoemVersion,
  PoemWorkspace,
  RhymeFoot,
  RhymeReport,
  Tone,
} from '../models/poem.models';

export const METER_TEMPLATES: MeterTemplate[] = [
  {
    id: 'wuyan-zeqi',
    name: '五言绝句 · 仄起首句不入韵',
    summary: '四句，每句五字；二、四句押韵',
    lineCount: 4,
    lineLength: 5,
    pattern: ['仄', '仄', '中', '平', '仄', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中', '仄', '中', '平'],
    rhymeLines: [1, 3],
  },
  {
    id: 'wuyan-pingqi',
    name: '五言绝句 · 平起首句入韵',
    summary: '四句，每句五字；一、二、四句押韵',
    lineCount: 4,
    lineLength: 5,
    pattern: ['中', '平', '中', '仄', '平', '仄', '仄', '中', '平', '仄', '中', '平', '中', '仄', '仄', '中', '平', '仄', '中', '平'],
    rhymeLines: [0, 1, 3],
  },
  {
    id: 'qiyan-zeqi',
    name: '七言绝句 · 仄起首句入韵',
    summary: '四句，每句七字；一、二、四句押韵',
    lineCount: 4,
    lineLength: 7,
    pattern: ['仄', '仄', '中', '平', '中', '仄', '平', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中'],
    rhymeLines: [0, 1, 3],
  },
  {
    id: 'qiyan-pingqi',
    name: '七言绝句 · 平起首句不入韵',
    summary: '四句，每句七字；二、四句押韵',
    lineCount: 4,
    lineLength: 7,
    pattern: ['中', '平', '中', '仄', '仄', '中', '平', '仄', '仄', '中', '平', '平', '仄', '仄', '中', '平', '中', '仄', '中', '平', '仄', '仄', '中', '平', '中', '仄', '仄', '中', '平'],
    rhymeLines: [1, 3],
  },
];

const STORAGE_KEY = 'sologsb-1015-poetry-workspace-v1';
const PUNCTUATION = new Set(['，', '。', '！', '？', '；', '：', '、', ' ', '\t']);
const TONE_DICTIONARY: Record<string, Tone> = {
  春: '平', 眠: '平', 不: '仄', 觉: '仄', 晓: '仄', 处: '仄', 闻: '平', 啼: '平', 鸟: '仄',
  夜: '仄', 来: '平', 风: '平', 雨: '仄', 声: '平', 花: '平', 落: '仄', 知: '平', 多: '平', 少: '仄',
  国: '仄', 破: '仄', 山: '平', 河: '平', 在: '仄', 城: '平', 深: '平', 木: '仄', 草: '仄', 独: '仄',
  明: '平', 月: '仄', 高: '平', 天: '平', 故: '仄', 乡: '平', 万: '仄', 里: '仄', 江: '平', 船: '平',
};

const clone = <T>(value: T): T => structuredClone(value);
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function key(line: number, position: number): string {
  return `${line}:${position}`;
}

function defaultMark(): CharacterMark {
  return { tone: '?', rhyme: '', pauseAfter: false, basis: '', note: '' };
}

function initialWorkspace(): PoemWorkspace {
  const now = new Date().toISOString();
  const spring = '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。';
  const marks: Record<string, CharacterMark> = {};
  const cells = [
    ['晓', 0, '平', false], ['鸟', 1, '平', false], ['声', 2, '平', false], ['少', 3, '平', false],
  ] as const;
  cells.forEach(([char, line, tone, pause]) => {
    marks[key(line, 4)] = { tone, rhyme: 'A', pauseAfter: pause, basis: '《平水韵》上声十七筱', note: `${char} 为韵脚` };
  });
  marks[key(0, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '句中平声' };
  marks[key(1, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '' };
  marks[key(2, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '' };

  const variants = spring.replace('处处闻啼鸟', '处处闻啼鸟');
  const topVersion: PoemVersion = {
    id: 'version-main',
    name: '通行本 · 孟浩然集',
    source: '《孟浩然诗集笺注》',
    createdAt: now,
    text: variants,
    marks,
    antithesisPairs: [],
  };
  const variant: PoemVersion = {
    id: 'version-song',
    name: '宋刻本异文',
    source: '宋蜀刻本',
    createdAt: now,
    text: '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
    marks: clone(marks),
    antithesisPairs: [],
  };
  return {
    title: '春晓',
    author: '孟浩然',
    templateId: 'wuyan-zeqi',
    versions: [topVersion, variant],
    activeVersionId: topVersion.id,
    updatedAt: now,
  };
}

function loadWorkspace(): PoemWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialWorkspace();
    const parsed = JSON.parse(raw) as PoemWorkspace;
    return parsed.versions?.length ? parsed : initialWorkspace();
  } catch {
    return initialWorkspace();
  }
}

@Injectable({ providedIn: 'root' })
export class PoetryStoreService {
  readonly workspace = signal<PoemWorkspace>(loadWorkspace());
  readonly selectedLine = signal(0);
  readonly selectedPosition = signal(4);
  readonly baselineVersionId = signal<string>('');
  readonly currentDiffIndex = signal(0);
  readonly toast = signal('');
  readonly undoCount = signal(0);
  readonly redoCount = signal(0);
  /** 0 逐字标注 / 1 格律与对仗 / 2 异文比较 / 3 版本与导出 */
  readonly activeTabIndex = signal(0);
  /** 从检查结果跳转定位的字格，用于高亮提示 */
  readonly focusedCell = signal<{ line: number; position: number; nonce: number } | null>(null);

  private undoStack: PoemWorkspace[] = [];
  private redoStack: PoemWorkspace[] = [];

  readonly activeVersion = computed(() => {
    const state = this.workspace();
    return state.versions.find((version) => version.id === state.activeVersionId) ?? state.versions[0];
  });

  readonly template = computed(() => {
    return METER_TEMPLATES.find((item) => item.id === this.workspace().templateId) ?? METER_TEMPLATES[0];
  });

  readonly lines = computed(() => this.activeVersion().text.split('\n'));

  readonly analysis = computed<AnalysisLine[]>(() => {
    const version = this.activeVersion();
    const template = this.template();
    return this.lines().map((line, lineIndex) => {
      const chars = Array.from(line).filter((char) => !PUNCTUATION.has(char));
      const cells: AnalysisCell[] = chars.map((char, position) => {
        const mark = version.marks[key(lineIndex, position)] ?? defaultMark();
        const expected = template.pattern[lineIndex * template.lineLength + position] ?? '中';
        const actual = mark.tone === '?' ? (TONE_DICTIONARY[char] ?? '?') : mark.tone;
        let status: AnalysisCell['status'] = 'neutral';
        let message = '标点或不计律位置';
        if (PUNCTUATION.has(char)) {
          status = 'neutral';
        } else if (actual === '?') {
          status = 'unknown';
          message = '尚未标注平仄';
        } else if (expected === '中') {
          status = 'correct';
          message = '可平可仄';
        } else if (actual === expected) {
          status = 'correct';
          message = '合律';
        } else if (this.isAcceptableVariant(template, lineIndex, position)) {
          status = 'variant';
          message = '一三五位置的可接受变体';
        } else {
          status = 'error';
          message = `此处应为${expected}声`;
        }
        return { char, position, expected, actual, status, message, mark };
      });
      const rhymeChars = template.rhymeLines.includes(lineIndex) ? cells.slice(-1).map((cell) => cell.char) : [];
      return {
        index: lineIndex,
        cells,
        rhymeChars,
        errors: cells.filter((cell) => cell.status === 'error').length,
        variants: cells.filter((cell) => cell.status === 'variant').length,
      };
    });
  });

  /** 只核对模板规定的押韵句：逐句末字落在哪一韵部 */
  readonly rhymeReport = computed<RhymeReport>(() => {
    const analysis = this.analysis();
    const template = this.template();
    const feet: RhymeFoot[] = template.rhymeLines
      .map((lineIndex) => {
        const cells = analysis[lineIndex]?.cells ?? [];
        const cell = cells.at(-1);
        if (!cell) return null;
        return { line: lineIndex, position: cell.position, char: cell.char, group: cell.mark.rhyme.trim() } satisfies RhymeFoot;
      })
      .filter((foot): foot is RhymeFoot => foot !== null);

    const groups: string[] = [];
    feet.forEach((foot) => {
      if (foot.group && !groups.includes(foot.group)) groups.push(foot.group);
    });

    // 主韵部：出现次数最多；并列时取最先出现的韵部
    let mainGroup = groups[0] ?? '';
    if (groups.length > 1) {
      let bestCount = -1;
      groups.forEach((group) => {
        const count = feet.filter((foot) => foot.group === group).length;
        if (count > bestCount) {
          bestCount = count;
          mainGroup = group;
        }
      });
    }

    const missing = feet.filter((foot) => !foot.group);
    const mixed = groups.length > 1;
    const offRhymes = mixed ? feet.filter((foot) => foot.group && foot.group !== mainGroup) : [];

    const charOrder: string[] = [];
    const charMap = new Map<string, RhymeFoot[]>();
    feet.forEach((foot) => {
      if (!charMap.has(foot.char)) {
        charMap.set(foot.char, []);
        charOrder.push(foot.char);
      }
      charMap.get(foot.char)!.push(foot);
    });
    const repeatedChars = charOrder
      .map((char) => ({ char, feet: charMap.get(char) ?? [] }))
      .filter((entry) => entry.feet.length > 1);

    return { feet, groups, mixed, mainGroup, missing, offRhymes, repeatedChars };
  });

  readonly issues = computed<PoemIssue[]>(() => {
    const analysis = this.analysis();
    const version = this.activeVersion();
    const rhyme = this.rhymeReport();
    const issues: PoemIssue[] = [];

    analysis.forEach((line) => {
      line.cells.filter((cell) => cell.status === 'error').forEach((cell) => {
        issues.push({
          id: `meter-error-${line.index}-${cell.position}`,
          level: 'error',
          title: '出律位置',
          detail: `第 ${line.index + 1} 句第 ${cell.position + 1} 字“${cell.char}”：${cell.message}。`,
          line: line.index,
          position: cell.position,
        });
      });
      line.cells.filter((cell) => cell.status === 'variant').forEach((cell) => {
        issues.push({
          id: `meter-variant-${line.index}-${cell.position}`,
          level: 'info',
          title: '可接受变体',
          detail: `第 ${line.index + 1} 句第 ${cell.position + 1} 字“${cell.char}”：${cell.message}。`,
          line: line.index,
          position: cell.position,
        });
      });
      line.cells.filter((cell) => cell.status === 'unknown').forEach((cell) => {
        issues.push({
          id: `meter-unknown-${line.index}-${cell.position}`,
          level: 'warning',
          title: '平仄待标',
          detail: `第 ${line.index + 1} 句第 ${cell.position + 1} 字“${cell.char}”平仄尚未确认。`,
          line: line.index,
          position: cell.position,
        });
      });
    });

    // 押韵句逐句核对韵部
    rhyme.missing.forEach((foot) => {
      issues.push({
        id: `rhyme-missing-${foot.line}`,
        level: 'warning',
        title: '韵脚未填韵部',
        detail: `第 ${foot.line + 1} 句押韵句末字“${foot.char}”尚未填写韵部，无法并入韵组核对。`,
        line: foot.line,
        position: foot.position,
      });
    });
    if (rhyme.mixed) {
      issues.push({
        id: 'rhyme-mixed',
        level: 'error',
        title: '押韵句韵部不一致（落韵）',
        detail:
          `押韵句共填出 ${rhyme.groups.length} 个韵部（${rhyme.groups.join('、')}），应以韵部「${rhyme.mainGroup}」为主韵；` +
          `第 ${rhyme.offRhymes.map((foot) => `${foot.line + 1} 句“${foot.char}”（${foot.group}）`).join('、')} 落韵。`,
        line: rhyme.offRhymes[0]?.line,
        position: rhyme.offRhymes[0]?.position,
      });
      rhyme.offRhymes.forEach((foot) => {
        issues.push({
          id: `rhyme-off-${foot.line}`,
          level: 'error',
          title: `落韵：第 ${foot.line + 1} 句不入主韵`,
          detail: `第 ${foot.line + 1} 句末字“${foot.char}”填入韵部「${foot.group}」，与主韵「${rhyme.mainGroup}」不合，属落韵（出韵）。`,
          line: foot.line,
          position: foot.position,
        });
      });
    }
    rhyme.repeatedChars.forEach(({ char, feet }) => {
      issues.push({
        id: `rhyme-repeat-${char.codePointAt(0)}-${feet.map((foot) => foot.line).join('-')}`,
        level: 'warning',
        title: `同字重韵：“${char}”重复做韵脚`,
        detail:
          `同一个字“${char}”在第 ${feet.map((foot) => `${foot.line + 1} 句`).join('、')}重复充当韵脚` +
          (new Set(feet.map((foot) => foot.group)).size > 1
            ? `（分填韵部 ${[...new Set(feet.map((foot) => foot.group))].join('、')}，仅看韵部标签会漏掉）。`
            : '，即使韵部相同也应避免重韵。'),
        line: feet[feet.length - 1].line,
        position: feet[feet.length - 1].position,
      });
    });
    if (rhyme.feet.length > 0 && !rhyme.mixed && rhyme.missing.length === 0 && rhyme.repeatedChars.length === 0) {
      issues.push({
        id: 'rhyme-ok',
        level: 'info',
        title: '押韵核对通过',
        detail: `${rhyme.feet.length} 个押韵句末字同属韵部「${rhyme.mainGroup}」，未见落韵与同字重韵。`,
        line: rhyme.feet[0].line,
        position: rhyme.feet[0].position,
      });
    }

    if (version.antithesisPairs.length === 0) {
      issues.push({ id: 'antithesis-empty', level: 'info', title: '尚未标记对仗', detail: '可在“格律与对仗”页把两句建立对仗关系。' });
    }
    if (!issues.some((issue) => issue.level === 'error')) {
      issues.unshift({ id: 'meter-ok', level: 'info', title: '格律检查通过', detail: '未发现硬性出律；请继续核对可接受变体与押韵。' });
    }
    return issues;
  });

  readonly diff = computed<CharDiff[]>(() => {
    const left = this.workspace().versions.find((version) => version.id === this.baselineVersionId());
    const right = this.activeVersion();
    if (!left || left.id === right.id) return [];
    const leftChars = Array.from(left.text.replace(/\n/g, ''));
    const rightChars = Array.from(right.text.replace(/\n/g, ''));
    const size = Math.max(leftChars.length, rightChars.length);
    return Array.from({ length: size }, (_, index) => ({
      index,
      left: leftChars[index] ?? '',
      right: rightChars[index] ?? '',
      changed: leftChars[index] !== rightChars[index],
    }));
  });

  readonly differences = computed(() => this.diff().filter((item) => item.changed).map((item) => item.index));
  readonly baselineVersion = computed(() => this.workspace().versions.find((version) => version.id === this.baselineVersionId()));

  selectVersion(id: string): void {
    this.workspace.update((workspace) => ({ ...workspace, activeVersionId: id }));
  }

  selectCell(line: number, position: number): void {
    this.selectedLine.set(line);
    this.selectedPosition.set(position);
    this.focusedCell.set(null);
  }

  /** 从检查结果点一条跳到对应字格：切回逐字标注页并高亮、滚动到位 */
  focusIssue(issue: PoemIssue): void {
    if (issue.line === undefined || issue.position === undefined) return;
    this.focusCell(issue.line, issue.position);
  }

  /** 直接跳到指定字格（如押韵概览中的韵脚） */
  focusCell(line: number, position: number): void {
    this.selectedLine.set(line);
    this.selectedPosition.set(position);
    this.activeTabIndex.set(0);
    this.focusedCell.set({ line, position, nonce: Date.now() });
    setTimeout(() => {
      const element = document.getElementById(this.cellDomId(line, position));
      element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 120);
  }

  cellDomId(line: number, position: number): string {
    return `meter-cell-${line}-${position}`;
  }

  setTemplate(id: string): void {
    this.commit((workspace) => {
      workspace.templateId = id;
    });
  }

  updateText(text: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      version.text = text;
    });
  }

  updateTitle(title: string): void {
    this.commit((workspace) => {
      workspace.title = title;
    });
  }

  updateVersionSource(source: string): void {
    this.commit((workspace) => {
      this.versionIn(workspace).source = source;
    });
  }

  setMark(patch: Partial<CharacterMark>): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      version.marks[id] = { ...defaultMark(), ...version.marks[id], ...patch };
    });
  }

  cycleTone(): void {
    const cell = this.selectedCell();
    const next: Record<Tone, MarkTone | '?'> = { '?': '平', '平': '仄', '仄': '中', '中': '?' };
    this.setMark({ tone: next[cell?.actual ?? '?'] });
  }

  togglePause(): void {
    const cell = this.selectedCell();
    this.setMark({ pauseAfter: !(cell?.mark.pauseAfter ?? false) });
  }

  cycleRhyme(): void {
    const cell = this.selectedCell();
    const current = cell?.mark.rhyme ?? '';
    const next = current === '' ? 'A' : current === 'A' ? 'B' : current === 'B' ? 'C' : '';
    this.setMark({ rhyme: next });
  }

  addAntithesis(): void {
    const line = this.selectedLine();
    const other = line === 0 ? 1 : line - 1;
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      if (version.antithesisPairs.some((pair) => pair.leftLine === line && pair.rightLine === other)) return;
      version.antithesisPairs.push({ id: uid('pair'), leftLine: Math.min(line, other), rightLine: Math.max(line, other), note: '结构相对，词性相应。' });
    });
  }

  removeAntithesis(id: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      version.antithesisPairs = version.antithesisPairs.filter((pair) => pair.id !== id);
    });
  }

  updateAntithesis(id: string, note: string): void {
    this.commit((workspace) => {
      const pair = this.versionIn(workspace).antithesisPairs.find((item) => item.id === id);
      if (pair) pair.note = note;
    });
  }

  snapshot(): void {
    const active = clone(this.activeVersion());
    active.id = uid('version');
    active.name = `校勘稿 ${this.workspace().versions.length}`;
    active.createdAt = new Date().toISOString();
    this.commit((workspace) => {
      workspace.versions.unshift(active);
      workspace.activeVersionId = active.id;
    });
    this.toast.set('已建立独立校勘稿');
  }

  duplicateActiveAsBaseline(): void {
    this.baselineVersionId.set(this.activeVersion().id);
  }

  nextDifference(): void {
    const values = this.differences();
    if (!values.length) return;
    const current = values.findIndex((index) => index >= this.currentDiffIndex());
    this.currentDiffIndex.set(values[(current + 1) % values.length]);
  }

  previousDifference(): void {
    const values = this.differences();
    if (!values.length) return;
    const reverse = [...values].reverse();
    const current = reverse.findIndex((index) => index <= this.currentDiffIndex());
    this.currentDiffIndex.set(reverse[(current + 1) % reverse.length]);
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(clone(this.workspace()));
    this.workspace.set(previous);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(this.redoStack.length);
    this.persist();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(clone(this.workspace()));
    this.workspace.set(next);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(this.redoStack.length);
    this.persist();
  }

  exportProofreadCopy(): string {
    const workspace = this.workspace();
    const active = this.activeVersion();
    const template = this.template();
    const analysis = this.analysis();
    const rhyme = this.rhymeReport();
    const issues = this.issues();
    const blank = '—';
    const cell = (text: string | null | undefined): string => {
      const value = (text ?? '').replace(/\s*\n\s*/g, '；').replace(/\|/g, '丨').trim();
      return value || blank;
    };
    const levelLabel: Record<PoemIssue['level'], string> = { error: '错误', warning: '待核', info: '通过' };

    const blocks: string[] = [];
    blocks.push(
      `# ${workspace.title} · 格律校对稿`,
      '',
      `- 作者：${workspace.author || blank}`,
      `- 底本：${active.name}`,
      `- 出处：${active.source || blank}`,
      `- 格律模板：${template.name}（${template.summary}）`,
      `- 导出版本：${active.name}`,
      `- 导出时间：${new Date().toLocaleString()}`,
      '',
      '## 一、逐字标注',
      '',
      '说明：平仄“□”表示尚未确认；“停顿”列标“顿”表示该字后有停顿；“韵组”为校勘员填写的韵部标签。',
      '',
    );

    analysis.forEach((line) => {
      blocks.push(`### 第 ${line.index + 1} 句　${this.lines()[line.index] ?? ''}`);
      blocks.push('');
      blocks.push('| 字序 | 字 | 平仄（实标） | 模板应为 | 合律判定 | 韵组 | 停顿 | 判断依据 | 批注 |');
      blocks.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
      line.cells.forEach((item) => {
        const verdict = {
          correct: '合律',
          variant: '可接受变体',
          error: '出律',
          unknown: '待标',
          neutral: '不计律',
        }[item.status];
        blocks.push(
          `| ${item.position + 1} | ${item.char} | ${item.actual === '?' ? '□' : item.actual} | ${item.expected} | ${verdict}（${cell(item.message)}） | ${cell(item.mark.rhyme)} | ${item.mark.pauseAfter ? '顿' : blank} | ${cell(item.mark.basis)} | ${cell(item.mark.note)} |`,
        );
      });
      blocks.push('');
    });

    blocks.push('## 二、押韵核对');
    blocks.push('');
    blocks.push(`按模板「${template.name}」核对第 ${template.rhymeLines.map((line) => line + 1).join('、')} 句，共 ${rhyme.feet.length} 个押韵句。`);
    blocks.push('');
    blocks.push('| 句 | 韵脚字 | 所填韵部 | 核对结论 |');
    blocks.push('| --- | --- | --- | --- |');
    rhyme.feet.forEach((foot) => {
      let verdict: string;
      if (!foot.group) verdict = '未填韵部，无法核对';
      else if (rhyme.mixed && foot.group !== rhyme.mainGroup) verdict = `落韵：不入主韵「${rhyme.mainGroup}」`;
      else if (rhyme.repeatedChars.some((entry) => entry.feet.includes(foot))) verdict = `同字重韵（主韵「${rhyme.mainGroup}」）`;
      else verdict = `合韵（主韵「${rhyme.mainGroup}」）`;
      blocks.push(`| 第 ${foot.line + 1} 句 | ${foot.char} | ${cell(foot.group)} | ${verdict} |`);
    });
    blocks.push('');

    const rhymeConclusions: string[] = [];
    if (rhyme.feet.length === 0) {
      rhymeConclusions.push('- 模板未规定押韵句，未作押韵核对。');
    } else {
      if (rhyme.missing.length) {
        rhymeConclusions.push(
          `- [待核] 韵脚未填韵部：第 ${rhyme.missing.map((foot) => `${foot.line + 1} 句“${foot.char}”`).join('、')}。`,
        );
      }
      if (rhyme.mixed) {
        rhymeConclusions.push(
          `- [错误] 落韵：押韵句共填出 ${rhyme.groups.length} 个韵部（${rhyme.groups.join('、')}）；主韵为「${rhyme.mainGroup}」，` +
            `第 ${rhyme.offRhymes.map((foot) => `${foot.line + 1} 句“${foot.char}”（${foot.group}）`).join('、')} 不入主韵。`,
        );
      } else if (!rhyme.missing.length) {
        rhymeConclusions.push(`- [通过] ${rhyme.feet.length} 个押韵句末字同属韵部「${rhyme.mainGroup}」。`);
      }
      if (rhyme.repeatedChars.length) {
        rhyme.repeatedChars.forEach(({ char, feet }) => {
          rhymeConclusions.push(
            `- [待核] 同字重韵：“${char}”在第 ${feet.map((foot) => `${foot.line + 1} 句`).join('、')}重复做韵脚` +
              (new Set(feet.map((foot) => foot.group)).size > 1
                ? `（分填韵部 ${[...new Set(feet.map((foot) => foot.group || blank))].join('、')}）。`
                : '。'),
          );
        });
      }
    }
    blocks.push(...rhymeConclusions, '');

    blocks.push('## 三、对仗关系');
    blocks.push('');
    if (active.antithesisPairs.length === 0) {
      blocks.push('未建立句间对仗关系。', '');
    } else {
      active.antithesisPairs.forEach((pair, index) => {
        blocks.push(
          `${index + 1}. 第 ${pair.leftLine + 1} 句 ↔ 第 ${pair.rightLine + 1} 句`,
          `   - 上句：${this.lines()[pair.leftLine] ?? blank}`,
          `   - 下句：${this.lines()[pair.rightLine] ?? blank}`,
          `   - 对仗说明：${cell(pair.note)}`,
        );
      });
      blocks.push('');
    }

    blocks.push('## 四、检查结论（全部记录）');
    blocks.push('');
    const errorCount = issues.filter((issue) => issue.level === 'error').length;
    const warningCount = issues.filter((issue) => issue.level === 'warning').length;
    blocks.push(`共计 ${issues.length} 条：错误 ${errorCount} 条、待核 ${warningCount} 条、通过/提示 ${issues.length - errorCount - warningCount} 条。`);
    blocks.push('');
    issues.forEach((issue, index) => {
      const locate = issue.line !== undefined ? `（第 ${issue.line + 1} 句${issue.position !== undefined ? `第 ${issue.position + 1} 字` : ''}）` : '';
      blocks.push(`${index + 1}. [${levelLabel[issue.level]}] ${issue.title}${locate}：${issue.detail}`);
    });
    blocks.push('');

    return blocks.join('\n');
  }

  downloadProofreadCopy(): void {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([this.exportProofreadCopy()], { type: 'text/markdown;charset=utf-8' }));
    anchor.download = `${this.workspace().title}-格律校对稿.md`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  selectedCell(): AnalysisCell | undefined {
    return this.analysis()[this.selectedLine()]?.cells[this.selectedPosition()];
  }

  private commit(mutator: (workspace: PoemWorkspace) => void): void {
    this.undoStack.push(clone(this.workspace()));
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack = [];
    const next = clone(this.workspace());
    mutator(next);
    next.updatedAt = new Date().toISOString();
    this.workspace.set(next);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(0);
    this.persist();
  }

  private versionIn(workspace: PoemWorkspace): PoemVersion {
    const version = workspace.versions.find((item) => item.id === workspace.activeVersionId) ?? workspace.versions[0];
    return version;
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspace()));
  }

  private isAcceptableVariant(template: MeterTemplate, line: number, position: number): boolean {
    if (template.lineLength === 5) return position === 0 || position === 2;
    return position === 0 || position === 2 || position === 4;
  }
}
