import { app, shell, BrowserWindow, ipcMain, clipboard, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater' // 只使用 electron-updater 的 autoUpdater
import log from 'electron-log'

// 配置日志
log.initialize({ preload: true })
log.transports.file.level = 'info' // 设置文件日志级别
log.transports.console.level = 'debug' // 设置控制台日志级别

// 确保设置正确的环境变量
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = is.dev ? 'development' : 'production'
}

// 存储窗口引用
let mainWindow: BrowserWindow | null = null
let billDetailsWindow: BrowserWindow | null = null
let frontDetailsWindow: BrowserWindow | null = null
let backDetailsWindow: BrowserWindow | null = null

function createWindow(): void {
  log.info('创建主窗口')
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 450,
    minWidth: 450,
    maxWidth: 450,
    maxHeight: 900,
    minHeight: 900,
    height: 900,
    resizable: true, // 防止用户调整窗口大小
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  // 隐藏菜单栏，并且按下 Alt 也不会弹出
  mainWindow.setMenu(null)
  mainWindow.setAutoHideMenuBar(true)

  mainWindow.on('ready-to-show', () => {
    log.info('主窗口准备显示')
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    autoUpdater.checkForUpdatesAndNotify()
  }

  // 生产环境下启用自动更新
  if (process.env.NODE_ENV === 'production') {
    // // 显示当前环境的对话框
    // dialog.showMessageBox({
    //   type: 'info',
    //   title: '环境信息',
    //   message: `当前运行环境: ${process.env.NODE_ENV}`,
    //   buttons: ['确定']
    // })

    // 配置更新服务器
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: `https://gitee.com/keons/electron-vite-tem/releases/download/`,
      // url: 'https://gitee.com/keons/electron-vite-tem/raw/master/updates/',
      channel: 'latest'
    })

    // // 每小时检查一次更新
    // setInterval(
    //   () => {
    //     autoUpdater.checkForUpdates()
    //   },
    //   60 * 60 * 1000
    // )

    // 立即检查更新
    autoUpdater.checkForUpdates()

    // 检查更新事件
    autoUpdater.on('checking-for-update', () => {
      log.info('正在检查更新...')
    })

    // 下载进度事件
    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `下载速度: ${progressObj.bytesPerSecond}`
      logMessage = `${logMessage} - 已下载 ${progressObj.percent}%`
      logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`
      log.info(logMessage)
    })

    autoUpdater.on('update-downloaded', () => {
      log.info('更新已下载完成，准备安装')
      dialog
        .showMessageBox({
          type: 'info',
          title: '安装更新',
          message: '更新下载完成，应用将重启并安装',
          buttons: ['现在重启']
        })
        .then(() => {
          log.info('用户确认安装更新，应用将重启')
          autoUpdater.quitAndInstall(false, true)
        })
    })

    autoUpdater.on('error', (error) => {
      log.error('更新失败', error)
      dialog.showErrorBox(
        '更新失败',
        `更新过程中发生错误: ${error.message}\n请稍后重试或联系开发者。`
      )
    })
  }

  // mainWindow.webContents.openDevTools()
}

// 创建票据详情窗口
function createBillDetailsWindow(billData: any): void {
  log.info('创建票据详情窗口', { billId: billData?.id })
  // 如果窗口已存在，则关闭它
  if (billDetailsWindow) {
    log.debug('关闭已存在的票据详情窗口')
    billDetailsWindow.close()
    billDetailsWindow = null
  }

  billDetailsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    modal: false, // 非模态窗口
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  billDetailsWindow.setMenu(null)

  // 加载票据详情窗口的HTML
  // if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  //   billDetailsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/#/billDetail`)
  // } else {
  //   billDetailsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
  //     hash: '/billDetail'
  //   })
  // }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // billDetailsWindow.loadURL('https://github.com')
    billDetailsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + `/#/billDetail`)
  } else {
    billDetailsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/billDetail'
    })
  }
  // 注册一次性监听：等待子窗口发送 'child-ready' 消息
  ipcMain.once('child-ready', (event) => {
    // 使用 event.sender 发送数据给该窗口
    event.sender.send('bill-data', billData)
  })

  billDetailsWindow.on('ready-to-show', () => {
    billDetailsWindow?.show()
    // // 发送数据到渲染进程
    // console.log(billData)
    // billDetailsWindow?.webContents.send('bill-data', billData)
  })

  // billDetailsWindow.webContents.openDevTools()
  billDetailsWindow.on('closed', () => {
    billDetailsWindow = null
  })
}

ipcMain.handle('create-bill-details-window', (_event, args) => {
  createBillDetailsWindow(args)
})

// 创建票据正面详情窗口
function createBillFrontDetailsWindow(billData: any): void {
  // 如果窗口已存在，则关闭它
  if (frontDetailsWindow) {
    frontDetailsWindow.close()
    frontDetailsWindow = null
  }

  frontDetailsWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    modal: false, // 非模态窗口
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  frontDetailsWindow.setMenu(null)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // frontDetailsWindow.loadURL('https://github.com')
    frontDetailsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + `/#/billFront`)
  } else {
    frontDetailsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/billFront'
    })
  }
  // 注册一次性监听：等待子窗口发送 'child-ready' 消息
  ipcMain.once('child-ready', (event) => {
    // 使用 event.sender 发送数据给该窗口
    event.sender.send('bill-data', billData)
  })

  frontDetailsWindow.on('ready-to-show', () => {
    frontDetailsWindow?.show()
  })

  // frontDetailsWindow.webContents.openDevTools()
  frontDetailsWindow.on('closed', () => {
    frontDetailsWindow = null
  })
}
ipcMain.handle('create-bill-copy-window', async (_event, billData: any) => {
  // 如果窗口已存在，则关闭它
  if (frontDetailsWindow) {
    frontDetailsWindow.close()
    frontDetailsWindow = null
  }

  // 创建隐藏窗口
  frontDetailsWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    show: false, // 不显示窗口
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  frontDetailsWindow.setMenu(null)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // frontDetailsWindow.loadURL('https://github.com')
    frontDetailsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + `/#/billFront`)
  } else {
    frontDetailsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/billFront'
    })
  }

  // 等待页面加载完毕
  await new Promise<void>((resolve) => {
    frontDetailsWindow?.webContents.once('did-finish-load', () => {
      resolve()
    })
  })

  // 注册一次性监听：等待子窗口发送 'child-ready' 消息
  ipcMain.once('child-ready', (event) => {
    // 使用 event.sender 发送数据给该窗口
    event.sender.send('bill-data', billData)
  })
  // 将数据发送给子窗口（子窗口需要在 onMounted 中监听 'bill-data' 事件）
  // frontDetailsWindow.webContents.send('bill-data', billData)
  // console.log('主进程：数据已发送给隐藏子窗口', billData)

  // 延时等待子窗口渲染完成（根据实际情况调整延时时间）
  await new Promise((resolve) => setTimeout(resolve, 3000))
  // 截取页面并复制到剪贴板
  try {
    const image = await frontDetailsWindow?.capturePage()
    if (image) {
      clipboard.writeImage(image)
      return { success: true, message: 'Screenshot succeeded' }
    } else {
      return { success: false, message: 'No image captured' }
    }
  } catch (err) {
    console.error('截图失败', err)
    return { success: false, message: 'Screenshot failed' }
  } finally {
    frontDetailsWindow?.close()
    frontDetailsWindow = null
  }
})

/*
 * 打开票据正面详情窗口
 * @param {any} billData - 票据数据
 *
 */
ipcMain.handle('create-bill-front-details-window', (_event, args) => {
  createBillFrontDetailsWindow(args)
})

// 创建票据背面详情窗口
function createBillBackDetailsWindow(billData: any): void {
  // 如果窗口已存在，则关闭它
  if (backDetailsWindow) {
    backDetailsWindow.close()
    backDetailsWindow = null
  }

  backDetailsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    modal: false, // 非模态窗口
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  backDetailsWindow.setMenu(null)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // backDetailsWindow.loadURL('https://github.com')
    backDetailsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + `/#/billBack`)
  } else {
    backDetailsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/billBack'
    })
  }
  // 注册一次性监听：等待子窗口发送 'child-ready' 消息
  ipcMain.once('child-ready', (event) => {
    // 使用 event.sender 发送数据给该窗口
    event.sender.send('bill-data', billData)
  })

  backDetailsWindow.on('ready-to-show', () => {
    backDetailsWindow?.show()
    // // 发送数据到渲染进程
    // console.log(billData)
    // backDetailsWindow?.webContents.send('bill-data', billData)
  })

  // backDetailsWindow.webContents.openDevTools()
  backDetailsWindow.on('closed', () => {
    backDetailsWindow = null
  })
}

ipcMain.handle('create-bill-back-copy-window', async (_event, billData: any) => {
  // 如果窗口已存在，则关闭它
  if (backDetailsWindow) {
    backDetailsWindow.close()
    backDetailsWindow = null
  }

  // 创建隐藏窗口
  backDetailsWindow = new BrowserWindow({
    width: 800,
    height: 800,
    show: false, // 不显示窗口
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  backDetailsWindow.setMenu(null)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // backDetailsWindow.loadURL('https://github.com')
    backDetailsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + `/#/billBack`)
  } else {
    backDetailsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: '/billBack'
    })
  }

  // 等待页面加载完毕
  await new Promise<void>((resolve) => {
    backDetailsWindow?.webContents.once('did-finish-load', () => {
      resolve()
    })
  })

  // 注册一次性监听：等待子窗口发送 'child-ready' 消息
  ipcMain.once('child-ready', (event) => {
    // 使用 event.sender 发送数据给该窗口
    event.sender.send('bill-data', billData)
  })
  // 将数据发送给子窗口（子窗口需要在 onMounted 中监听 'bill-data' 事件）
  // backDetailsWindow.webContents.send('bill-data', billData)
  // console.log('主进程：数据已发送给隐藏子窗口', billData)

  // 延时等待子窗口渲染完成（根据实际情况调整延时时间）
  await new Promise((resolve) => setTimeout(resolve, 3000))
  // **获取页面完整高度**
  const fullHeight = await backDetailsWindow.webContents.executeJavaScript(`
    document.documentElement.scrollHeight
  `)

  console.log('完整页面高度:', fullHeight)

  // **调整窗口高度**
  backDetailsWindow.setBounds({ width: 800, height: fullHeight + 80 })
  // 延时等待子窗口渲染完成（根据实际情况调整延时时间）
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // 截取页面并复制到剪贴板
  try {
    log.info('尝试截取页面并复制到剪贴板')
    const image = await backDetailsWindow?.capturePage()
    if (image) {
      clipboard.writeImage(image)
      log.info('截图成功并已复制到剪贴板')
      return { success: true, message: 'Screenshot succeeded' }
    } else {
      log.warn('未能捕获图像')
      return { success: false, message: 'No image captured' }
    }
  } catch (err) {
    log.error('截图失败', err)
    return { success: false, message: 'Screenshot failed' }
  } finally {
    log.debug('关闭票据背面详情窗口')
    backDetailsWindow?.close()
    backDetailsWindow = null
  }
})

/*
 * 打开票据背面详情窗口
 * @param {any} billData - 票据数据
 *
 */
ipcMain.handle('create-bill-back-details-window', (_event, args) => {
  createBillBackDetailsWindow(args)
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  log.info('应用初始化完成，准备创建窗口')
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    log.debug('新窗口已创建', { windowId: window.id })
    optimizer.watchWindowShortcuts(window)
  })

  // 设置IPC通信
  // 显示票据详情窗口
  ipcMain.on('show-bill-window', (_event, billData) => {
    createBillDetailsWindow(billData)
  })

  // 关闭票据详情窗口
  ipcMain.on('close-bill-window', () => {
    if (billDetailsWindow) {
      billDetailsWindow.close()
    }
  })

  // 处理票据删除事件，转发给主窗口以刷新数据
  ipcMain.on('bill-deleted', (_event, billId) => {
    // 将票据删除事件转发给主窗口
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('refresh-bill-list', billId)
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  log.info('所有窗口已关闭')
  if (process.platform !== 'darwin') {
    log.info('应用即将退出')
    app.quit()
  }
})

// 记录未捕获的异常
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常', error)
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
