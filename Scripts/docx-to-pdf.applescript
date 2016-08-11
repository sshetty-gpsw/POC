#! /usr/bin/osascript

on run argv
	
	set srcPath to item 1 of argv
	set destPath to item 2 of argv
	set srcFile to POSIX file srcPath
	log srcFile
	tell application "Microsoft Word"
		activate
		open srcFile
	end tell
	
	tell application "System Events"
		tell process "Microsoft Word"
			click menu item "Print..." of menu 1 of menu bar item "File" of menu bar 1
			delay 1
			click menu button "PDF" of window "Print"
			# Wait until the Menu button menu is created before proceeding
			repeat until exists menu item "Save as PDF…" of menu 1 of menu button "PDF" of window "Print"
			end repeat
			# Select the "Save as PDF" menu item
			click menu item "Save as PDF…" of menu 1 of menu button "PDF" of window "Print"
			delay 2
			keystroke "a" using command down
			delay 2
			keystroke destPath
			delay 2
			keystroke return
			delay 2
			keystroke return
			delay 2
			keystroke "w" using command down
			delay 1
			click button "Don’t Save" of sheet 1 of window 1			
		end tell
	end tell
	
end run
