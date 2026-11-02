package com.fitguide.fitguide

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.SharedPreferences
import android.view.View
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetLaunchIntent
import es.antonborri.home_widget.HomeWidgetProvider

/**
 * The "FitGuide today" home-screen widget: today's workout, the streak,
 * water and readiness. The app writes the lines (lib/src/services/home_widgets.dart);
 * tapping the widget opens the app.
 */
class TodayWidgetProvider : HomeWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        widgetData: SharedPreferences,
    ) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.today_widget).apply {
                setTextViewText(R.id.widget_title, widgetData.getString("today_title", null) ?: "FitGuide")
                setTextViewText(R.id.widget_subtitle, widgetData.getString("today_subtitle", null) ?: "Open FitGuide to see today's workout")
                showLine(this, R.id.widget_streak, widgetData.getString("today_streak", null))
                showLine(this, R.id.widget_water, widgetData.getString("today_water", null))
                showLine(this, R.id.widget_readiness, widgetData.getString("today_readiness", null))
                setOnClickPendingIntent(R.id.widget_root, HomeWidgetLaunchIntent.getActivity(context, MainActivity::class.java))
            }
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    private fun showLine(views: RemoteViews, viewId: Int, text: String?) {
        if (text.isNullOrEmpty()) {
            views.setViewVisibility(viewId, View.GONE)
        } else {
            views.setViewVisibility(viewId, View.VISIBLE)
            views.setTextViewText(viewId, text)
        }
    }
}
