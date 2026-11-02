//
//  TodayWidget.swift
//  The "FitGuide today" home-screen widget for iPhone: today's workout, the
//  streak, water and readiness, written by the app
//  (lib/src/services/home_widgets.dart). See README.md here to add it in Xcode.
//

import SwiftUI
import WidgetKit

private let appGroupId = "group.com.fitguide.fitguide"

struct TodayEntry: TimelineEntry {
  let date: Date
  let title: String
  let subtitle: String
  let lines: [String]
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry {
    TodayEntry(date: Date(), title: "Leg Day", subtitle: "Today · week 1, day 3", lines: ["🔥 5-day streak", "💧 3 of 8 glasses"])
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    let data = UserDefaults(suiteName: appGroupId)
    let read = { (key: String) in data?.string(forKey: "today_\(key)") ?? "" }
    let title = read("title")
    if title.isEmpty {
      completion(context.isPreview ? placeholder(in: context) : TodayEntry(date: Date(), title: "FitGuide", subtitle: "Open FitGuide to see today's workout", lines: []))
      return
    }
    completion(TodayEntry(
      date: Date(),
      title: title,
      subtitle: read("subtitle"),
      lines: ["streak", "water", "readiness"].map(read).filter { !$0.isEmpty }))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    // The app asks for a new timeline whenever the numbers change.
    getSnapshot(in: context) { entry in completion(Timeline(entries: [entry], policy: .never)) }
  }
}

struct TodayWidgetView: View {
  var entry: TodayEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("FITGUIDE").font(.system(size: 11, weight: .bold)).foregroundColor(Color(red: 0, green: 0.77, blue: 0.71))
      Text(entry.title).font(.headline).foregroundColor(.white).lineLimit(1)
      Text(entry.subtitle).font(.caption).foregroundColor(.white.opacity(0.7)).lineLimit(1)
      Spacer(minLength: 2)
      ForEach(entry.lines, id: \.self) { line in
        Text(line).font(.caption).foregroundColor(.white).lineLimit(1)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .containerBackground(Color(red: 0.075, green: 0.098, blue: 0.129), for: .widget)
  }
}

@main
struct TodayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TodayWidget", provider: TodayProvider()) { entry in
      TodayWidgetView(entry: entry)
    }
    .configurationDisplayName("FitGuide today")
    .description("Today's workout, your streak, water and readiness.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
