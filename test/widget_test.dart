import 'package:flutter_test/flutter_test.dart';
import 'package:fitguide/main.dart';

void main() {
  testWidgets('App initializes smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const FitGuideApp());
    expect(find.byType(FitGuideApp), findsOneWidget);
  });
}
