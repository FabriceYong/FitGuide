import '../models/json.dart';

/// Showing and entering weights and lengths in the user's units
/// (lib/units.ts on the website). The API keeps everything in kg and cm.
enum Units {
  metric,
  imperial;

  static Units of(Object? value) => value == 'imperial' ? Units.imperial : Units.metric;

  bool get isImperial => this == Units.imperial;

  /// "kg" or "lb".
  String get weight => isImperial ? 'lb' : 'kg';

  /// "kilograms" or "pounds", for screen readers.
  String get weightName => isImperial ? 'pounds' : 'kilograms';

  /// "cm" or "in", for body measurements.
  String get length => isImperial ? 'in' : 'cm';
  String get lengthName => isImperial ? 'inches' : 'centimetres';
}

const lbPerKg = 2.20462;
const cmPerInch = 2.54;

double _oneDecimal(num v) => (v * 10).round() / 10;

/// A weight in kg, in the user's unit (one decimal).
double weightIn(num kg, Units units) => _oneDecimal(units.isImperial ? kg * lbPerKg : kg);

/// A weight entered in the user's unit, in kg.
double kgFrom(num value, Units units) => units.isImperial ? (value / lbPerKg * 10000).round() / 10000 : value.toDouble();

/// "62.5 kg" or "137.8 lb".
String weightText(num kg, Units units) => '${numText(weightIn(kg, units))} ${units.weight}';

/// A length in cm, in the user's unit (one decimal).
double lengthIn(num cm, Units units) => _oneDecimal(units.isImperial ? cm / cmPerInch : cm);

/// A length entered in the user's unit, in cm.
double cmFrom(num value, Units units) => units.isImperial ? (value * cmPerInch * 100).round() / 100 : value.toDouble();

/// "81 cm" or "31.9 in".
String lengthText(num cm, Units units) => '${numText(lengthIn(cm, units))} ${units.length}';

/// A height: "170 cm" or "5′ 7″".
String heightText(num cm, Units units) {
  if (!units.isImperial) return '${numText(cm)} cm';
  final inches = (cm / cmPerInch).round();
  return '${inches ~/ 12}′ ${inches % 12}″';
}

/// A body measurement field (weightKg, waistCm, bodyFatPct …) in the user's units.
String measureUnit(String key, Units units) => key.endsWith('Kg') ? units.weight : (key.endsWith('Cm') ? units.length : '%');
double measureIn(String key, num value, Units units) => key.endsWith('Kg') ? weightIn(value, units) : (key.endsWith('Cm') ? lengthIn(value, units) : value.toDouble());
double measureFrom(String key, num value, Units units) => key.endsWith('Kg') ? kgFrom(value, units) : (key.endsWith('Cm') ? cmFrom(value, units) : value.toDouble());
String measureText(String key, num value, Units units) => '${numText(measureIn(key, value, units))} ${measureUnit(key, units)}';

const mlPerFlOz = 29.5735;

/// A volume of water: "750 ml", "1.25 l" or "25 fl oz".
String volumeText(num ml, Units units) {
  if (units.isImperial) return '${(ml / mlPerFlOz).round()} fl oz';
  return ml < 1000 ? '${ml.round()} ml' : '${numText((ml / 10).round() / 100)} l';
}
