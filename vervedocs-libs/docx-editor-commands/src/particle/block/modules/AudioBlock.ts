import { IRowElement } from '@vervedoc/docx-editor-schema'

const ALLOWED_MEDIA_PROTOCOLS = ['https:', 'http:', 'blob:', 'data:']

function isAllowedMediaUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url, location.href)
    return ALLOWED_MEDIA_PROTOCOLS.includes(protocol)
  } catch {
    return false
  }
}

export class AudioBlock {
  private element: IRowElement
  private audio: HTMLAudioElement | null = null
  
  constructor(element: IRowElement) {
    this.element = element
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = this.element.block!
    const audioBlock = block.audioBlock

    if (!audioBlock) return

    if (!audioBlock.src || !isAllowedMediaUrl(audioBlock.src)) return

    // 创建音频播放器容器
    const audioContainer = document.createElement('div')
    audioContainer.className = 'audio-player-container'
    audioContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      padding: 12px 16px;
      box-sizing: border-box;
      gap: 12px;
    `

    // 封面图
    if (audioBlock.poster) {
      const poster = document.createElement('img')
      poster.src = audioBlock.poster
      poster.style.cssText = `
        width: 56px;
        height: 56px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
      `
      audioContainer.append(poster)
    } else {
      // 默认音乐图标
      const iconContainer = document.createElement('div')
      iconContainer.style.cssText = `
        width: 56px;
        height: 56px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        flex-shrink: 0;
      `
      iconContainer.textContent = '🎵'
      audioContainer.append(iconContainer)
    }

    // 音频信息区域
    const infoContainer = document.createElement('div')
    infoContainer.style.cssText = `
      flex: 1;
      color: white;
      overflow: hidden;
      min-width: 0;
    `

    // 音频名称
    const audioName = document.createElement('div')
    audioName.textContent = audioBlock.name || '音频文件'
    audioName.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `
    infoContainer.append(audioName)

    // 进度条容器
    const progressContainer = document.createElement('div')
    progressContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    `

    // 当前时间
    const currentTime = document.createElement('span')
    currentTime.textContent = '00:00'
    currentTime.style.cssText = `
      font-size: 11px;
      opacity: 0.9;
      min-width: 35px;
    `

    // 进度条
    const progressBar = document.createElement('div')
    progressBar.style.cssText = `
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      cursor: pointer;
      position: relative;
    `

    const progress = document.createElement('div')
    progress.style.cssText = `
      width: 0%;
      height: 100%;
      background: white;
      border-radius: 2px;
      transition: width 0.1s;
    `
    progressBar.append(progress)

    // 总时长
    const totalTime = document.createElement('span')
    totalTime.textContent = '00:00'
    totalTime.style.cssText = `
      font-size: 11px;
      opacity: 0.9;
      min-width: 35px;
    `

    progressContainer.append(currentTime, progressBar, totalTime)
    infoContainer.append(progressContainer)

    audioContainer.append(infoContainer)

    // 播放按钮
    const playButton = document.createElement('button')
    playButton.innerHTML = '▶'
    playButton.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      flex-shrink: 0;
    `

    playButton.addEventListener('mouseenter', () => {
      playButton.style.background = 'rgba(255, 255, 255, 0.3)'
      playButton.style.transform = 'scale(1.1)'
    })

    playButton.addEventListener('mouseleave', () => {
      playButton.style.background = 'rgba(255, 255, 255, 0.2)'
      playButton.style.transform = 'scale(1)'
    })

    audioContainer.append(playButton)

    blockItemContainer.append(audioContainer)

    // 创建原生 audio 元素
    const audio = document.createElement('audio')
    audio.src = audioBlock.src
    audio.preload = 'metadata'
    this.audio = audio

    // 音频加载完成
    audio.addEventListener('loadedmetadata', () => {
      totalTime.textContent = this.formatTime(audio.duration)
    })

    // 播放中更新进度
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration || isNaN(audio.duration) || !isFinite(audio.duration)) return
      const percent = (audio.currentTime / audio.duration) * 100
      progress.style.width = `${percent}%`
      currentTime.textContent = this.formatTime(audio.currentTime)
    })

    // 播放状态改变
    audio.addEventListener('play', () => {
      playButton.innerHTML = '⏸'
    })

    audio.addEventListener('pause', () => {
      playButton.innerHTML = '▶'
    })

    audio.addEventListener('ended', () => {
      playButton.innerHTML = '▶'
      progress.style.width = '0%'
      currentTime.textContent = '00:00'
    })

    // 播放/暂停控制
    playButton.addEventListener('click', (e) => {
      e.stopPropagation()
      if (audio.paused) {
        audio.play().catch(err => {
          console.error('音频播放失败:', err)
        })
      } else {
        audio.pause()
      }
    })

    // 进度条点击跳转
    progressBar.addEventListener('click', (e) => {
      e.stopPropagation()
      const rect = progressBar.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      audio.currentTime = audio.duration * percent
    })
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  public destroy() {
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
  }
}
