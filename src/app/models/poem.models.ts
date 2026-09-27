export type Tone = '平' | '仄' | '中' | '?';
export type MarkTone = '平' | '仄' | '中';

export interface CharacterMark {
  tone: MarkTone | '?';
  rhyme: string;
  pauseAfter: boolean;
  basis: string;
  note: string;
}

export interface PoemVersion {
  id: string;
  name: string;
  source: string;
  createdAt: string;
  text: string;
  marks: Record<string, CharacterMark>;
  antithesisPairs: AntithesisPair[];
}

export interface AntithesisPair {
  id: string;
  leftLine: number;
  rightLine: number;
  note: string;
}

export interface PoemWorkspace {
  title: string;
  author: string;
  templateId: string;
  versions: PoemVersion[];
  activeVersionId: string;
  updatedAt: string;
}

export interface MeterTemplate {
  id: string;
  name: string;
  summary: string;
  lineCount: number;
  lineLength: number;
  pattern: Tone[];
  rhymeLines: number[];
}

export interface AnalysisCell {
  char: string;
  position: number;
  expected: Tone;
  actual: Tone;
  status: 'correct' | 'variant' | 'error' | 'unknown' | 'neutral';
  message: string;
  mark: CharacterMark;
}

export interface AnalysisLine {
  index: number;
  cells: AnalysisCell[];
  rhymeChars: string[];
  errors: number;
  variants: number;
}

export interface PoemIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  line?: number;
  position?: number;
}

/** 模板押韵句上的一个韵脚（句末字） */
export interface RhymeFoot {
  line: number;
  position: number;
  char: string;
  /** 校勘员所填韵部（空串表示未填） */
  group: string;
}

/** 押韵句逐句核对结果 */
export interface RhymeReport {
  feet: RhymeFoot[];
  /** 已填韵部种类（按首次出现顺序） */
  groups: string[];
  /** 出现两种以上韵部 */
  mixed: boolean;
  /** 韵脚最多的韵部；并列时取最先出现的韵部 */
  mainGroup: string;
  missing: RhymeFoot[];
  /** 不属于主韵部的韵脚（落韵 / 出韵） */
  offRhymes: RhymeFoot[];
  /** 同一个字重复充当韵脚的出现记录 */
  repeatedChars: { char: string; feet: RhymeFoot[] }[];
}

export interface CharDiff {
  index: number;
  left: string;
  right: string;
  changed: boolean;
}
