Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 启动 Electron 原生程序，窗口模式为 0 (完全静默无控制台黑窗口)
command = "cmd /c cd /d """ & currentDir & """ && npx electron ."
ws.Run command, 0, False
