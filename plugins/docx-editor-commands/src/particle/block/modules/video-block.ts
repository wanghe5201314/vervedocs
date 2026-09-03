import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import type { IElement } from '@vervedoc/docx-editor-schema'

const ALLOWED_MEDIA_PROTOCOLS = ['https:', 'http:', 'blob:', 'data:']

function isAllowedMediaUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url, location.href)
    return ALLOWED_MEDIA_PROTOCOLS.includes(protocol)
  } catch {
    return false
  }
}

export class VideoBlock {
  private element: IElement
  private player: Plyr | null = null

  constructor(element: IElement) {
    this.element = element
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = (this.element as any).block
    const videoBlock = block?.videoBlock

    if (!videoBlock) return

    if (!videoBlock.src || !isAllowedMediaUrl(videoBlock.src)) return

    // 创建视频容器
    const videoContainer = document.createElement('div')
    videoContainer.className = 'video-player-container'
    videoContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    `

    // 创建 video 元素
    const video = document.createElement('video')
    video.className = 'plyr-video'
    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
    `
    video.src = videoBlock.src
    video.controls = false // Plyr 会接管控制
    video.preload = 'metadata'

    // 设置封面图
    if (videoBlock.poster) {
      video.poster = videoBlock.poster
    }

    videoContainer.append(video)
    blockItemContainer.append(videoContainer)

    // 初始化 Plyr
    this.player = new Plyr(video, {
      controls: [
        'play-large',      // 大播放按钮
        'play',            // 播放/暂停
        'progress',        // 进度条
        'current-time',    // 当前时间
        'duration',        // 总时长
        'mute',            // 静音
        'volume',          // 音量
        'settings',        // 设置
        'pip',             // 画中画
        'airplay',         // AirPlay
        'fullscreen'       // 全屏
      ],
      settings: ['quality', 'speed'],  // 清晰度和倍速设置
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 2]  // 倍速选项
      },
      ratio: '16:9',     // 默认宽高比
      keyboard: {
        focused: true,    // 聚焦时启用键盘控制
        global: false     // 全局键盘控制
      },
      tooltips: {
        controls: true,   // 显示控制提示
        seek: true        // 显示进度提示
      },
      captions: {
        active: false,    // 默认不显示字幕
        language: 'zh',
        update: true
      },
      autopause: true,   // 当其他视频播放时自动暂停
      resetOnEnd: false, // 结束时不重置
      clickToPlay: true  // 点击播放
    })

    // 自定义 Plyr 样式
    this.applyCustomStyles()
  }

  private applyCustomStyles() {
    // 创建自定义样式
    const styleId = 'plyr-custom-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Plyr 自定义样式 */
        .plyr {
          --plyr-color-main: #409eff;
          --plyr-video-background: #000;
          --plyr-menu-background: rgba(0, 0, 0, 0.9);
          --plyr-menu-color: #fff;
          border-radius: 8px;
        }

        .plyr__control--overlaid {
          background: rgba(64, 158, 255, 0.9);
        }

        .plyr__control--overlaid:hover {
          background: rgba(64, 158, 255, 1);
        }

        .plyr__control:hover {
          background: rgba(64, 158, 255, 0.1);
        }

        .plyr__menu__container {
          border-radius: 4px;
        }

        .plyr--video {
          border-radius: 8px;
          overflow: hidden;
        }
      `
      document.head.append(style)
    }
  }

  public destroy() {
    if (this.player) {
      this.player.destroy()
      this.player = null
    }
  }

  // 获取播放器实例(供外部调用)
  public getPlayer(): Plyr | null {
    return this.player
  }
}
