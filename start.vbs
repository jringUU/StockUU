' start.vbs - 100% 靜默啟動 StockUU（完全零黑視窗）
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 檢查 8080 端口是否已在運行
Set oExec = WshShell.Exec("netstat -ano")
portInUse = False
Do While Not oExec.StdOut.AtEndOfStream
    line = oExec.StdOut.ReadLine()
    If InStr(line, ":8080") > 0 And InStr(line, "LISTENING") > 0 Then
        portInUse = True
        Exit Do
    End If
Loop

If Not portInUse Then
    ' 以完全隱藏視窗 (0) 在背景執行 PowerShell 伺服器
    psCmd = "powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & currentDir & "\server.ps1"""
    WshShell.Run psCmd, 0, False
    WScript.Sleep 1500
End If

' 直接在預設瀏覽器開啟頁面
WshShell.Run "http://localhost:8080/", 1, False
