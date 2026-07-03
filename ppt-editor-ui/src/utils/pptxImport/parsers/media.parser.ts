import { nanoid } from 'nanoid'
import { NS_A, NS_P, NS_R } from '../constants'
import { getFirstChildByTag, getAttr, getAttrNS, findFirstDescendant } from '../xml.helper'
import { resolveRelativePath } from '../rels.resolver'
import { parseTransform } from './text.parser'
import type { PptxSlideContext } from '../types'
import type { PPTVideoElement, PPTAudioElement } from '@/types/slides'

const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'webm', 'wmv', 'flv', 'mkv']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'wma', 'ogg', 'aac']

/**
 * Check if a p:pic element represents a video or audio element.
 */
export function isMediaElement(picEl: Element, context: PptxSlideContext): boolean {
  // Check nvPicPr -> nvPr for video/audio file reference
  const nvPicPr = getFirstChildByTag(picEl, NS_P, 'nvPicPr')
  if (!nvPicPr) return false

  const nvPr = getFirstChildByTag(nvPicPr, NS_P, 'nvPr')
  if (!nvPr) return false

  const videoFile = findFirstDescendant(nvPr, NS_A, 'videoFile')
  const audioFile = findFirstDescendant(nvPr, NS_A, 'audioFile')

  return !!(videoFile || audioFile)
}

/**
 * Parse a p:pic element as a video or audio element.
 */
export function parseMediaElement(
  picEl: Element,
  context: PptxSlideContext,
): PPTVideoElement | PPTAudioElement | null {
  const spPr = getFirstChildByTag(picEl, NS_P, 'spPr')
  const transform = parseTransform(spPr, context)
  if (!transform) return null

  const nvPicPr = getFirstChildByTag(picEl, NS_P, 'nvPicPr')
  if (!nvPicPr) return null

  const nvPr = getFirstChildByTag(nvPicPr, NS_P, 'nvPr')
  if (!nvPr) return null

  const videoFile = findFirstDescendant(nvPr, NS_A, 'videoFile')
  const audioFile = findFirstDescendant(nvPr, NS_A, 'audioFile')

  if (videoFile) {
    return parseVideoElement(videoFile, picEl, transform, context)
  }
  if (audioFile) {
    return parseAudioElement(audioFile, transform, context)
  }

  return null
}

function parseVideoElement(
  videoFileEl: Element,
  picEl: Element,
  transform: { left: number; top: number; width: number; height: number; rotate: number },
  context: PptxSlideContext,
): PPTVideoElement | null {
  const rId = getAttrNS(videoFileEl, NS_R, 'link') || getAttrNS(videoFileEl, NS_R, 'id') || ''
  
  let src = ''
  if (rId) {
    const relEntry = context.slideRels.get(rId)
    if (relEntry) {
      const resolvedPath = resolveRelativePath(context.slideBasePath, relEntry.target)
      src = context.mediaMap.get(resolvedPath) || context.mediaMap.get(relEntry.target) || ''
    }
  }

  // Get poster/thumbnail from blipFill
  let poster: string | undefined
  const blipFill = getFirstChildByTag(picEl, NS_P, 'blipFill')
  if (blipFill) {
    const blip = getFirstChildByTag(blipFill, NS_A, 'blip')
    if (blip) {
      const embedRId = getAttrNS(blip, NS_R, 'embed')
      if (embedRId) {
        const relEntry = context.slideRels.get(embedRId)
        if (relEntry) {
          const resolvedPath = resolveRelativePath(context.slideBasePath, relEntry.target)
          poster = context.mediaMap.get(resolvedPath) || context.mediaMap.get(relEntry.target)
        }
      }
    }
  }

  return {
    id: nanoid(10),
    type: 'video',
    left: transform.left,
    top: transform.top,
    width: transform.width,
    height: transform.height,
    rotate: transform.rotate,
    src,
    poster,
  }
}

function parseAudioElement(
  audioFileEl: Element,
  transform: { left: number; top: number; width: number; height: number; rotate: number },
  context: PptxSlideContext,
): PPTAudioElement | null {
  const rId = getAttrNS(audioFileEl, NS_R, 'link') || getAttrNS(audioFileEl, NS_R, 'id') || ''

  let src = ''
  if (rId) {
    const relEntry = context.slideRels.get(rId)
    if (relEntry) {
      const resolvedPath = resolveRelativePath(context.slideBasePath, relEntry.target)
      src = context.mediaMap.get(resolvedPath) || context.mediaMap.get(relEntry.target) || ''
    }
  }

  return {
    id: nanoid(10),
    type: 'audio',
    left: transform.left,
    top: transform.top,
    width: transform.width,
    height: transform.height,
    rotate: transform.rotate,
    fixedRatio: true,
    color: '#000000',
    loop: false,
    autoplay: false,
    src,
  }
}
