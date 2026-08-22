import { TitleLevel } from '../enum/title'

export interface ICatalogItem {
  id: string
  name: string
  level: TitleLevel
  pageNo: number
  subCatalog: ICatalogItem[]
}

export type ICatalog = ICatalogItem[]
