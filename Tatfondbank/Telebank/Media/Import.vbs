Const ReadOnly = 0
Const MROpenFlag_CanModifyAll = 10

Dim MR, Conn, IU
Set MR = CreateObject ("INFra.MediaRepository")
Set IU = CreateObject ("INFra.Install.Helper")
Set Conn = MR.Connect ("System")

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")
'ImportDir = GetImportDir()
ProcessFolder(GetImportDir())


function GetImportDir()
set args = WScript.Arguments
if (args.count) > 0 then
  GetImportDir = args(0)
  exit function
else
  GetImportDir = fso.GetFolder(ScriptFolder())
  exit function
end if
end function 

Function ProcessFolder(FolderName)
    Dim f, fc, fldrs, fld
    Set f = fso.GetFolder(FolderName)
    Set fc = f.Files
    Set fldrs = f.SubFolders
    
    For Each fl In fc
        If fso.GetExtensionName (fl.name) = "xml" Then
            ImportFile fl.path
        End If
    Next
    For Each fld In fldrs
	ProcessFolder(fld.Path)
    next
	Conn.Commit

End Function

Function GetLanguageID(strLanguageID)
    strHex = Right(strLanguageID, Len(strLanguageID) - 2)
    strBasicHex = "&H" & strHex
    GetLanguageID = CLng(strBasicHex)    
End Function


Sub ImportFile (fname)
    Dim x
    Dim DisplayName
    Set x = CreateObject ("Microsoft.XMLDOM.1.0")

    ItemCounter = 0
    'print ("Importing from: '" & fname & "'")

    
    x.async = false
    x.validateOnParse = true
    x.load (fname)
'    On Error Resume Next
    If Err.Number <> 0 Then
        MsgBox "Can't load or parse file:" & Chr(10) & fname, _
         vbCritical, "Error While Importing Media Repository Files"
         Exit Sub
    End If
    
    Dim TotalItems

    Set Services = x.selectNodes("media/mr-service")
    For Each Service In Services 
        ServiceName = Service.selectSingleNode("@id").nodeTypedValue

        Set ServiceIsEmpty = Service.selectSingleNode("@empty")
        If Not ServiceIsEmpty Is Nothing Then
            If ServiceIsEmpty.nodeValue = "yes" Then
                ItemCounter = ItemCounter + 1
            End If
        End If

        Set Languages = Service.selectNodes("language")
        For Each Language In Languages
            nLangID = GetLanguageID(Language.selectSingleNode("@langid").nodeTypedValue)
            ServiceDisplayName = Language.selectSingleNode("display-name").nodeTypedValue  
            ServiceDescription = Language.selectSingleNode("description").nodeTypedValue  
            MR.SetServiceProperties ServiceName, nLangID, ServiceDisplayName, ServiceDescription
        Next

        'print (ServiceName)
        Set Items = Service.selectNodes("mr-file")
		TotalItems = Items.length
        For Each Item In Items
            IdentityName = Item.selectSingleNode("@id").nodeTypedValue
            Set Languages = Item.selectNodes("language")
            For Each Language In Languages
                File = Language.selectSingleNode("file").nodeTypedValue
                nLangID = GetLanguageID(Language.selectSingleNode("@langid").nodeTypedValue)
                Dim fff
                Set fff = fso.GetFile(fname)
                s = fso.BuildPath (fff.ParentFolder, File)
		if fso.FileExists( s ) then
                Set MRItem = Conn.OpenItem ( _
                    MROpenFlag_CanModifyAll, _ 
                    ServiceName, IdentityName, nLangID, "wav")

		DisplayName= Language.selectSingleNode("display-name").nodeTypedValue  
		if len(DisplayName)>253 then
			DisplayName = left(DisplayName,249) & " ..."
		end if 
                MRItem.DisplayName  = DisplayName
		DisplayName= Language.selectSingleNode("description").nodeTypedValue  
		if len(DisplayName)>253 then
			DisplayName = left(DisplayName,249) & " ..."
		end if 
                MRItem.Description = DisplayName

                s2 = MRItem.FileName

'                On Error Resume Next
		If fso.GetExtensionName (s) = "wav" Then
			IU.CopyWavWithConvertInPureFormat s, s2
			if not fso.FileExists( s2 ) then
		                fso.CopyFile s, s2
			End If
		Else
	                fso.CopyFile s, s2
		End If
                If Err.Number <> 0 Then
                    MsgBox (" Can't copy file: """ & s & """" &  Chr(10) & _
                        " to: """ & s2 & """" & Chr(10) & _
                        " During importing: """ & fname & """" & Chr(10) & _
                        " Error description: " & Err.Description)
                    Err.Clear
                Else
                    ItemCounter = ItemCounter + 1 
                    Dim fileNew
                    Set fileNew = fso.GetFile (MRItem.FileName)
                    oldAttr = fileNew.Attributes

                    If oldAttr & ReadOnly Then
                        fileNew.Attributes = oldAttr And (Not ReadOnly)
                    Else
                        fileNew.Attributes = oldAttr Or ReadOnly
                    End If
                End If
'                On Error Goto 0
		end if 'file exist
            Next 
        Next 
    Next 

    If ItemCounter = 0  and TotalItems <> 0 Then
        MsgBox ("Warning: No files copyed during importing """ & fname & """")
    End If
End Sub


Sub print(line)
    Wscript.StdOut.WriteLine line
end sub

Function ScriptFolder()	
	ScriptFolder = left(Wscript.ScriptFullName,instrrev(Wscript.ScriptFullName,"\")-1)
End Function
