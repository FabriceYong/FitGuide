# The iPhone home-screen widget

`TodayWidget.swift` is the "FitGuide today" widget. The app already writes its
lines (`lib/src/services/home_widgets.dart`); the widget extension has to be
added in Xcode on a Mac once:

1. Open `ios/Runner.xcworkspace`. File → New → Target → **Widget Extension**,
   named `TodayWidget`, with "Include Configuration App Intent" off.
2. Replace the generated Swift file with `TodayWidget.swift` from this folder.
3. Under Signing & Capabilities, add the **App Groups** capability to both the
   `Runner` and `TodayWidget` targets with the group `group.com.fitguide.fitguide`
   (the app sets the same id in `HomeWidgets`).
4. Set the extension's iOS deployment target to 17.0 or later
   (`containerBackground`), build, and add the widget from the home screen.
