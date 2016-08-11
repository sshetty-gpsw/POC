
#! /usr/bin/osascript
on run argv
	set versionNumber to item 1 of argv	
	tell application "Finder"
		set itemPath to "../build/salesforce/Downloads/gopro-sdk-ios"
		set folderName to ("gopro-ios-sdk-" & versionNumber)
		set zipFile to (folderName & ".zip")
		log itemPath
		log zipFile
		do shell script "cd " & itemPath & "
				" & "unzip -d  gopro-ios-sdk wsdk.zip  " & "
				" & "rm -rf wsdk.zip" & "
				" & "cd .." & "
				" & "zip -r --exclude=*DS_Store --exclude=.* " & zipFile & " ./gopro-sdk-ios" & "
				" & "rm -rf gopro-sdk-ios"
		
	end tell
end run
