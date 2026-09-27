!macro customInstall
  DetailPrint "Registering VisionVault Windows Explorer context menu..."
  ; Context menu for all files
  WriteRegStr HKCU "Software\Classes\*\shell\TeleportWithVisionVault" "" "Teleport using VisionVault"
  WriteRegStr HKCU "Software\Classes\*\shell\TeleportWithVisionVault" "Icon" "$INSTDIR\VisionVault Desktop.exe"
  WriteRegStr HKCU "Software\Classes\*\shell\TeleportWithVisionVault\command" "" '"$INSTDIR\VisionVault Desktop.exe" --teleport "%1"'

  ; Context menu & file association for .vlt container files
  WriteRegStr HKCU "Software\Classes\.vlt" "" "VisionVault.VLTContainer"
  WriteRegStr HKCU "Software\Classes\VisionVault.VLTContainer" "" "VisionVault Teleport Package"
  WriteRegStr HKCU "Software\Classes\VisionVault.VLTContainer\DefaultIcon" "" "$INSTDIR\VisionVault Desktop.exe,0"
  WriteRegStr HKCU "Software\Classes\VisionVault.VLTContainer\shell\open\command" "" '"$INSTDIR\VisionVault Desktop.exe" --teleport "%1"'
  WriteRegStr HKCU "Software\Classes\VisionVault.VLTContainer\shell\TeleportWithVisionVault" "" "Teleport using VisionVault"
  WriteRegStr HKCU "Software\Classes\VisionVault.VLTContainer\shell\TeleportWithVisionVault\command" "" '"$INSTDIR\VisionVault Desktop.exe" --teleport "%1"'
!macroend

!macro customUninstall
  DetailPrint "Removing VisionVault Windows Explorer context menu..."
  DeleteRegKey HKCU "Software\Classes\*\shell\TeleportWithVisionVault"
  DeleteRegKey HKCU "Software\Classes\.vlt"
  DeleteRegKey HKCU "Software\Classes\VisionVault.VLTContainer"
!macroend


