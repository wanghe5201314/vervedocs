import { ITitleOption, ITitleSizeOption } from '../interface/Title'
import { TitleLevel } from '../enum/Title'

export const defaultTitleOption: Readonly<Required<ITitleOption>> = {
  defaultFirstSize: 21,
  defaultSecondSize: 19,
  defaultThirdSize: 16,
  defaultFourthSize: 14,
  defaultFifthSize: 12,
  defaultSixthSize: 10
}

export const titleSizeMapping: Record<TitleLevel, keyof ITitleSizeOption> = {
  [TitleLevel.FIRST]: 'defaultFirstSize',
  [TitleLevel.SECOND]: 'defaultSecondSize',
  [TitleLevel.THIRD]: 'defaultThirdSize',
  [TitleLevel.FOURTH]: 'defaultFourthSize',
  [TitleLevel.FIFTH]: 'defaultFifthSize',
  [TitleLevel.SIXTH]: 'defaultSixthSize'
}

export const titleOrderNumberMapping: Record<TitleLevel, number> = {
  [TitleLevel.FIRST]: 1,
  [TitleLevel.SECOND]: 2,
  [TitleLevel.THIRD]: 3,
  [TitleLevel.FOURTH]: 4,
  [TitleLevel.FIFTH]: 5,
  [TitleLevel.SIXTH]: 6
}

export const titleNodeNameMapping: Record<string, TitleLevel> = {
  H1: TitleLevel.FIRST,
  H2: TitleLevel.SECOND,
  H3: TitleLevel.THIRD,
  H4: TitleLevel.FOURTH,
  H5: TitleLevel.FIFTH,
  H6: TitleLevel.SIXTH
}
