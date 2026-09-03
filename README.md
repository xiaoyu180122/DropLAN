# ⚡ DropLAN - 局域网极速跨端快传 (Native PC & Web)

<p align="center">
  <img src="assets/icon.png" width="96" height="96" alt="DropLAN Logo" />
</p>

<p align="center">
  <strong>原生 Windows 桌面客户端 · 系统托盘常驻 · 手机免装 App · 多网卡智能识别 · 隔空剪贴板 · 千兆局域网原画直传</strong>
</p>

<p align="center">
  <a href="https://github.com/xiaoyu180122/DropLAN/releases/latest"><img src="https://img.shields.io/github/v/release/xiaoyu180122/DropLAN?color=10b981&label=Release&logo=github" alt="Release" /></a>
  <a href="https://github.com/xiaoyu180122/DropLAN/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows" alt="Platform Windows" />
  <img src="https://img.shields.io/badge/Electron-44.1-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite" alt="Vite" />
</p>

---

> **彻底告别微信文件传输助手！**  
> 拒绝画质压缩、拒绝文件体积限制、拒绝频繁掉线与扫码登录。只要手机与电脑在同一局域网（或连接手机热点），手机扫码即传，千兆带宽打满！

---

## 📥 下载安装 (Releases)

前往 [**GitHub Releases 最新发布页**](https://github.com/xiaoyu180122/DropLAN/releases/latest) 下载预编译二进制包：

| 版本类型 | 文件名 | 适用场景 | 说明 |
| :--- | :--- | :--- | :--- |
| 🟢 **绿色免安装便携版 (推荐)** | `DropLAN 1.0.1 (绿色免安装版).zip` | 即下即用 / U盘携带 | 解压后双击 `DropLAN.exe` 直接运行，不向系统写注册表 |
| 🔷 **Windows 标准安装包** | `DropLAN Setup 1.0.1 (Windows标准安装版).exe` | 个人主力电脑 | 标准向导安装，自动生成桌面图标与开始菜单项 |

---

## ✨ 核心功能与特性

### 1. 🛜 多网卡智能诊断与动态 IP 检索
* **多网卡智能优选**：自动识别物理 Wi-Fi、有线以太网及虚拟网卡（WSL2 / VMware / VPN / Clash 代理隧道），自动打分并置顶物理 Wi-Fi。
* **一键检索与切换**：二维码旁配有**手动检索当前局域网 IP 按钮**，支持多网卡一键自由切换，彻底解决网络环境变动导致手机扫码连不上的问题。

### 2. 📱 手机端零门槛：扫码即连，免装 App
* 电脑端启动即在中央呈现专属动态二维码与内网直达链接；
* 手机自带相机或浏览器扫码直接打开响应式 PWA 网页；
* **拍照即传**：直接调起手机原生高清相机，拍摄完毕秒级直达电脑，无需先存手机相册；
* **相册与文件批量多选**：支持原图、实况相片、4K 高清视频、大型文档不限速传输。

### 3. 🖼️ 全格式媒体预览与即时串流 (v1.0.1 全新升级)
* **全格式图片预览**：点击文件列表中的“小眼睛”预览图标，即可调出高清全屏灯箱。全面支持 JPG、JPEG、PNG、WebP、GIF、SVG、ICO、BMP 等格式，并深度兼容 HEIC、TIFF、PSD、RAW 等非主流格式快速解码预览。
* **灯箱专业控制**：支持鼠标滚轮平滑缩放、双击还原、90° 顺时针旋转、左右方向键切换上一张/下一张图片。
* **全格式音视频免下载串流**：基于 HTTP 206 断点分片技术与实时视频转码流，支持 MP4、WebM 原生秒播，同时兼容 MKV、AVI、WMV、FLV、RMVB、TS、MOV 等格式在线点播，支持 0.5x~2.0x 倍速播放与进度条即时拖动。
* **系统原生软件联动**：灯箱顶部集成“系统程序打开”按钮，可在 Windows 上一键调用系统默认看图工具（如 Windows 照片）或已安装的第三方专业播放器（如 PotPlayer / VLC）直接打开查看。
* **代码与文本高亮预览**：支持 `.txt`、`.md`、`.json`、`.js`、`.ts`、`.py`、`.html`、`.css` 等纯文本快速排版预览与一键复制代码。

### 4. 📦 批量多选与流式动态 ZIP 打包
* 拒绝几十张照片或零散文件一个个保存！
* 支持多选或全选，一键触发后端实时流式归档打包，零内存膨胀压力，秒级打包下载完整的 `.zip` 压缩包。

### 5. 📋 跨端隔空剪贴板（电脑自动写入系统剪贴板）
* 手机向电脑发送一段验证码、地址或长文本，电脑端自动静默写入 **Windows 系统剪贴板**，电脑直接 `Ctrl+V` 即可粘贴！
* 内置全局唯一消息指纹与 2.5 秒幂等防抖去重机制，杜绝任何重复消息打扰。

### 6. 🪟 Windows 原生深度集成
* **自定义接收目录**：支持在设置中通过 Windows 原生文件夹选择器自由指定存储盘符与目录；
* **系统托盘与自愈**：最小化至右下角系统托盘静默运行，右键菜单一键直达当前最新保存目录；
* **资源管理器精准定位**：每条记录带有定位按钮，一键调起 Windows 资源管理器并高亮定位选中文件；
* **原生系统通知**：后台收到文件时自动弹出 Windows 桌面通知气泡。

---

## 💡 个人热点传输秘籍（0 手机卡流量！）

外出没有路由器或在图书馆、户外时：
1. **手机开启【个人热点】**，电脑连接手机热点 Wi-Fi；
2. 打开 DropLAN 传输文件——**全程仅在手机和电脑的 Wi-Fi 天线间点对点直传，消耗 0 手机流量（蜂窝数据为 0 KB）**！
3. *贴心建议*：传文件时可暂时关闭手机蜂窝数据，或在 Windows Wi-Fi 中开启“设为按流量计费”，防止 Windows 系统后台静默更新。

---

## 🛠️ 本地开发与源码构建

### 环境要求
* [Node.js](https://nodejs.org/) >= 20.0.0
* Windows 10 / 11 (x64)

### 快速启动开发
```bash
# 1. 克隆代码仓库
git clone https://github.com/xiaoyu180122/DropLAN.git
cd DropLAN

# 2. 安装依赖
npm install

# 3. 启动开发模式 (前端 Vite + 后端 Express 联动热重载)
npm run dev

# 4. 启动 Electron PC 桌面端
npm run app
```

### 构建打包发布
```bash
# 构建前端并打包生产版服务端
npm run build

# 打包 Windows 绿色免安装版 (ZIP) 与 标准安装包 (EXE)
npm run dist
```
打包输出目录位于 `release/`。

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源，欢迎自由使用、修改和分发。
如有建议或遇到问题，欢迎提交 [Issues](https://github.com/xiaoyu180122/DropLAN/issues) 或 Pull Requests！
