import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/analytics.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../services/nutrition_service.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import '../../navigation.dart';
import '../dashboard/explore_tab.dart';
import 'barcode_scanner.dart';

/// Log a food: search the catalog, look up a packaged food by its barcode
/// (scanned with the camera, or typed), or enter a one-off item
/// (features/nutrition/FoodPicker.tsx). Pops true when something was added.
class FoodPicker extends StatefulWidget {
  const FoodPicker({super.key, required this.meal, required this.date});
  final String meal;
  final String date;

  @override
  State<FoodPicker> createState() => _FoodPickerState();
}

class _FoodPickerState extends State<FoodPicker> {
  final _search = TextEditingController();
  final _servings = TextEditingController(text: '1');
  final _name = TextEditingController();
  final _macros = {for (final k in ['calories', 'protein', 'carbs', 'fat']) k: TextEditingController()};
  List<Food> _foods = [];
  bool _loading = true;
  Food? _selected;
  bool _custom = false;
  bool _barcode = false;
  final _code = TextEditingController();
  BarcodeProduct? _product;
  bool _perServing = true;
  bool _busy = false;
  String? _error;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _lookup();
    for (final c in [_name, ..._macros.values, _servings]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    for (final c in [_search, _servings, _name, _code, ..._macros.values]) {
      c.dispose();
    }
    super.dispose();
  }

  void _onSearch(String _) {
    setState(() => _loading = true);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), _lookup);
  }

  Future<void> _lookup() async {
    try {
      final found = await searchFoods(_search.text);
      if (mounted) setState(() => _foods = found);
    } catch (err) {
      if (mounted) setState(() => _error = '$err');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _scan() async {
    final code = await Navigator.of(context).push<String>(pageRoute(const BarcodeScannerScreen()));
    if (code == null || !mounted) return;
    _code.text = code;
    await _lookupBarcode();
  }

  /// Find the barcode's product and fill in the manual form with it, to check and add.
  Future<void> _lookupBarcode() async {
    final code = _code.text.trim();
    if (!RegExp(r'^(\d{8}|\d{12,14})$').hasMatch(code)) return setState(() => _error = 'A barcode is 8, 12, 13 or 14 digits.');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final product = await lookupBarcode(code);
      if (!mounted) return;
      if (product == null) {
        setState(() => _error = 'We couldn’t find that product. Enter it manually instead.');
        return;
      }
      setState(() {
        _product = product;
        _barcode = false;
        _custom = true;
      });
      _fill(product.perServing != null);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// The product's numbers per serving or per 100 g, in the manual form.
  void _fill(bool perServing) {
    final p = _product!;
    final m = perServing ? p.perServing! : p.per100g!;
    final title = [if (p.brand != null) p.brand!, p.name].join(' ');
    setState(() => _perServing = perServing);
    _name.text = '$title (${perServing ? p.serving ?? '1 serving' : '100 g'})';
    _macros['calories']!.text = numText(m.calories);
    _macros['protein']!.text = numText(m.protein);
    _macros['carbs']!.text = numText(m.carbs);
    _macros['fat']!.text = numText(m.fat);
  }

  Future<void> _submit() async {
    final servings = double.tryParse(_servings.text) ?? 1;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final Json entry = _custom
          ? {
              'date': widget.date,
              'meal': widget.meal,
              'servings': servings,
              'name': _name.text.trim(),
              for (final e in _macros.entries) e.key: double.tryParse(e.value.text) ?? 0,
            }
          : {'date': widget.date, 'meal': widget.meal, 'servings': servings, 'foodSlug': _selected!.slug};
      await logFood(entry);
      track('food_logged', path: '/nutrition', props: {'custom': _custom, 'barcode': _product != null});
      if (mounted) Navigator.of(context).pop(true);
    } catch (err) {
      if (mounted) setState(() => _error = err is ApiError ? err.message : '$err');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _tab(String label, bool on, VoidCallback onTap) {
    return Material(
      color: on ? AppColors.limeLight : AppColors.whiteA(0.1),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Text(label, style: fg(size: 12, weight: FontWeight.w700, color: on ? AppColors.noirEclipse : AppColors.white)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final valid = _custom ? _name.text.trim().isNotEmpty && _macros['calories']!.text.isNotEmpty : _selected != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(spacing: 8, runSpacing: 8, children: [
          _tab('Search foods', !_custom && !_barcode, () => setState(() => _custom = _barcode = false)),
          _tab('Barcode', _barcode, () => setState(() {
            _barcode = true;
            _custom = false;
          })),
          _tab('Enter manually', _custom, () => setState(() {
            _custom = true;
            _barcode = false;
          })),
        ]),
        const SizedBox(height: 16),
        if (_barcode) ...[
          if (canScanBarcodes) ...[
            FgButton(label: 'Scan with the camera', icon: LucideIcons.scanBarcode, expand: true, radius: 12, height: 48, onPressed: _busy ? null : _scan),
            const SizedBox(height: 12),
          ],
          _labelled(
            'Or type the barcode',
            Row(children: [
              Expanded(
                child: FgTextField(
                  controller: _code,
                  hint: 'e.g. 3017620422003',
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  maxLength: 14,
                  fontSize: 14,
                  radius: 12,
                  border: AppColors.white30A(0.2),
                  semanticLabel: 'Barcode',
                  onSubmitted: (_) => _lookupBarcode(),
                ),
              ),
              const SizedBox(width: 8),
              FgButton(label: 'Look up', loading: _busy, radius: 12, height: 48, style: FgButtonStyle.secondary, onPressed: _busy ? null : _lookupBarcode),
            ]),
          ),
          const SizedBox(height: 8),
          Text('Product details from Open Food Facts.', style: fg(size: 12, color: AppColors.white70)),
          if (_error != null) ...[const SizedBox(height: 12), ErrorLine(_error!)],
        ] else if (!_custom) ...[
          SearchField(controller: _search, hint: 'Search, e.g. oats, salmon', radius: 12, onChanged: _onSearch),
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 256),
            child: _loading
                ? const LoadingRow('Searching…', padding: EdgeInsets.symmetric(vertical: 12))
                : _foods.isEmpty
                    ? Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text('No foods found. Try “Enter manually”.', style: fg(size: 14, color: AppColors.white70)))
                    : ListView.separated(
                        shrinkWrap: true,
                        itemCount: _foods.length,
                        separatorBuilder: (_, _) => Divider(color: AppColors.white30A(0.1), height: 1),
                        itemBuilder: (context, i) {
                          final f = _foods[i];
                          final on = _selected?.slug == f.slug;
                          return Semantics(
                            button: true,
                            selected: on,
                            child: Material(
                              color: on ? AppColors.limeLight.withValues(alpha: 0.15) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () => setState(() => _selected = f),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text.rich(TextSpan(children: [
                                      TextSpan(text: f.name, style: fg(size: 14, weight: FontWeight.w600)),
                                      if (f.isCustom) TextSpan(text: '  YOURS', style: fg(size: 10, color: AppColors.white70)),
                                    ])),
                                    Text(
                                      '${f.servingLabel} · ${f.calories.round()} kcal · P ${numText(f.protein)} g · C ${numText(f.carbs)} g · F ${numText(f.fat)} g',
                                      style: fg(size: 12, color: AppColors.white70),
                                    ),
                                  ]),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ] else ...[
          if (_product != null) ...[
            Text('From Open Food Facts. Check the numbers against the pack.', style: fg(size: 12, color: AppColors.white70)),
            const SizedBox(height: 8),
            if (_product!.perServing != null && _product!.per100g != null) ...[
              Segmented<bool>(
                options: [(true, 'Per serving${_product!.serving != null ? ' (${_product!.serving})' : ''}'), (false, 'Per 100 g')],
                value: _perServing,
                expand: true,
                onChanged: _fill,
              ),
              const SizedBox(height: 12),
            ],
          ],
          _labelled('Name', FgTextField(controller: _name, maxLength: 120, fontSize: 14, radius: 12, border: AppColors.white30A(0.2))),
          const SizedBox(height: 12),
          FgGrid(columns: 2, gap: 12, children: [
            for (final k in ['calories', 'protein', 'carbs', 'fat'])
              _labelled('${k[0].toUpperCase()}${k.substring(1)}${k == 'calories' ? ' (kcal)' : ' (g)'} per serving', NumberField(controller: _macros[k]!, border: AppColors.white30A(0.2))),
          ]),
        ],
        if (!_barcode) ...[
          const SizedBox(height: 12),
          _labelled('Servings', NumberField(controller: _servings, border: AppColors.white30A(0.2))),
          if (_error != null) ...[const SizedBox(height: 12), ErrorLine(_error!)],
          const SizedBox(height: 16),
          FgButton(label: 'Add', loading: _busy, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 48, onPressed: _busy || !valid ? null : _submit),
        ],
      ],
    );
  }

  Widget _labelled(String label, Widget child) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [Text(label, style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)), const SizedBox(height: 4), child],
      );
}
