import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import 'ui.dart';

/// Form controls matching the website's inputs (onboarding/ui.js and the
/// dashboard forms).

InputDecoration fgInputDecoration({
  String? hint,
  double fontSize = 16,
  Widget? suffix,
  Widget? prefix,
  double radius = 8,
  Color fill = AppColors.noirEclipse,
  Color? border,
  EdgeInsets padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
}) {
  OutlineInputBorder outline(Color color, [double width = 1]) =>
      OutlineInputBorder(borderRadius: BorderRadius.circular(radius), borderSide: BorderSide(color: color, width: width));
  return InputDecoration(
    hintText: hint,
    hintStyle: fg(size: fontSize, color: AppColors.muted),
    filled: true,
    fillColor: fill,
    isDense: true,
    contentPadding: padding,
    // At least the 48px touch height Android and iOS recommend.
    constraints: const BoxConstraints(minHeight: 48),
    suffixIcon: suffix,
    prefixIcon: prefix,
    enabledBorder: outline(border ?? AppColors.white30A(0.4)),
    disabledBorder: outline(AppColors.white30A(0.2)),
    focusedBorder: outline(AppColors.limeLight, 2),
    border: outline(border ?? AppColors.white30A(0.4)),
    counterText: '',
  );
}

/// A text input (`inputClass`: 44px tall, 8px radius, 16px text).
class FgTextField extends StatelessWidget {
  const FgTextField({
    super.key,
    this.controller,
    this.hint,
    this.keyboardType,
    this.obscure = false,
    this.enabled = true,
    this.autofillHints,
    this.textInputAction,
    this.onChanged,
    this.onSubmitted,
    this.maxLength,
    this.maxLines = 1,
    this.minLines,
    this.suffix,
    this.prefix,
    this.fontSize = 16,
    this.radius = 8,
    this.fill = AppColors.noirEclipse,
    this.border,
    this.inputFormatters,
    this.autofocus = false,
    this.semanticLabel,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    this.focusNode,
  });

  final TextEditingController? controller;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscure;
  final bool enabled;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final int? maxLength;
  final int maxLines;
  final int? minLines;
  final Widget? suffix;
  final Widget? prefix;
  final double fontSize;
  final double radius;
  final Color fill;
  final Color? border;
  final List<TextInputFormatter>? inputFormatters;
  final bool autofocus;
  final String? semanticLabel;
  final EdgeInsets padding;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    final field = TextField(
      controller: controller,
      focusNode: focusNode,
      keyboardType: keyboardType,
      obscureText: obscure,
      enabled: enabled,
      autofillHints: autofillHints,
      textInputAction: textInputAction,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      maxLength: maxLength,
      maxLines: obscure ? 1 : maxLines,
      minLines: minLines,
      autofocus: autofocus,
      inputFormatters: inputFormatters,
      autocorrect: !obscure && keyboardType != TextInputType.emailAddress,
      enableSuggestions: !obscure,
      style: fg(size: fontSize),
      decoration: fgInputDecoration(hint: hint, fontSize: fontSize, suffix: suffix, prefix: prefix, radius: radius, fill: fill, border: border, padding: padding),
    );
    return semanticLabel == null ? field : Semantics(label: semanticLabel, textField: true, child: field);
  }
}

/// A numeric input: digits and one decimal point.
class NumberField extends StatelessWidget {
  const NumberField({
    super.key,
    required this.controller,
    this.decimal = true,
    this.hint,
    this.onChanged,
    this.radius = 12,
    this.fontSize = 14,
    this.suffixText,
    this.fill = AppColors.noirEclipse,
    this.border,
    this.semanticLabel,
  });

  final TextEditingController controller;
  final bool decimal;
  final String? hint;
  final ValueChanged<String>? onChanged;
  final double radius;
  final double fontSize;
  final String? suffixText;
  final Color fill;
  final Color? border;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return FgTextField(
      controller: controller,
      hint: hint,
      keyboardType: TextInputType.numberWithOptions(decimal: decimal),
      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(decimal ? r'[0-9.]' : r'[0-9]'))],
      onChanged: onChanged,
      radius: radius,
      fontSize: fontSize,
      fill: fill,
      border: border ?? AppColors.white30A(0.3),
      semanticLabel: semanticLabel,
      suffix: suffixText == null
          ? null
          : Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Align(widthFactor: 1, alignment: Alignment.centerRight, child: Text(suffixText!, style: fg(size: 12, color: AppColors.white70))),
            ),
    );
  }
}

/// A password input with a show/hide toggle.
class PasswordField extends StatefulWidget {
  const PasswordField({super.key, required this.controller, this.enabled = true, this.newPassword = false, this.onChanged, this.textInputAction, this.onSubmitted});
  final TextEditingController controller;
  final bool enabled;
  final bool newPassword;
  final ValueChanged<String>? onChanged;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _show = false;

  @override
  Widget build(BuildContext context) {
    return FgTextField(
      controller: widget.controller,
      obscure: !_show,
      enabled: widget.enabled,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      textInputAction: widget.textInputAction,
      keyboardType: TextInputType.visiblePassword,
      autofillHints: [widget.newPassword ? AutofillHints.newPassword : AutofillHints.password],
      suffix: IconButton(
        onPressed: widget.enabled ? () => setState(() => _show = !_show) : null,
        tooltip: _show ? 'Hide password' : 'Show password',
        icon: Icon(_show ? LucideIcons.eyeOff : LucideIcons.eye, size: 20, color: AppColors.white70),
      ),
    );
  }
}

/// A 14px label above a control, with an optional hint (`Field` in ui.js).
class FormFieldLabel extends StatelessWidget {
  const FormFieldLabel({super.key, required this.label, required this.child, this.hint, this.labelStyle});
  final String label;
  final Widget child;
  final String? hint;
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: labelStyle ?? fg(size: 14, weight: FontWeight.w500)),
        const SizedBox(height: 6),
        child,
        if (hint != null) ...[const SizedBox(height: 6), Text(hint!, style: fg(size: 14, color: AppColors.white70))],
      ],
    );
  }
}

/// `text-xs font-bold uppercase tracking-wider text-white-70` field label.
class SmallLabel extends StatelessWidget {
  const SmallLabel(this.text, {super.key, this.color = AppColors.white70, this.size = 12, this.tracking = 0.05});
  final String text;
  final Color color;
  final double size;
  final double tracking;

  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(), style: fgLabel(size: size, color: color, tracking: tracking));
}

/// A step's title and an optional sentence explaining it (`StepHeading`).
class StepHeading extends StatelessWidget {
  const StepHeading({super.key, required this.title, this.description});
  final String title;
  final String? description;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(title, style: fg(size: atLeast(context, Breakpoints.sm) ? 28 : 24, weight: FontWeight.w700, height: 1.25, letterSpacing: -0.3))),
          if (description != null) ...[
            const SizedBox(height: 8),
            Text(description!, style: fg(size: 16, color: AppColors.white70, height: 1.6)),
          ],
        ],
      ),
    );
  }
}

/// A labelled group of controls (`Section` fieldset).
class FormSection extends StatelessWidget {
  const FormSection({super.key, required this.title, required this.child, this.hint});
  final String title;
  final String? hint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text(title, style: fg(size: 14, weight: FontWeight.w600))),
        if (hint != null) ...[const SizedBox(height: 4), Text(hint!, style: fg(size: 14, color: AppColors.white70))],
        const SizedBox(height: 12),
        child,
      ],
    );
  }
}

/// A selectable card with a tick (`OptionCard`).
class OptionCard extends StatelessWidget {
  const OptionCard({
    super.key,
    required this.selected,
    required this.onTap,
    required this.title,
    this.description,
    this.icon,
    this.color = AppColors.limeLight,
  });

  final bool selected;
  final VoidCallback onTap;
  final String title;
  final String? description;
  final IconData? icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: selected ? AppColors.limeLight.withValues(alpha: 0.1) : AppColors.whiteA(0.03),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: selected ? AppColors.limeLight : AppColors.white30A(0.3)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (icon != null) ...[
                  ExcludeSemantics(
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(color: color.withAlpha(0x22), borderRadius: BorderRadius.circular(8)),
                      child: Icon(icon, size: 20, color: color),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: fg(size: 16, weight: FontWeight.w600, height: 1.35)),
                      if (description != null) ...[
                        const SizedBox(height: 2),
                        Text(description!, style: fg(size: 14, color: AppColors.white70, height: 1.35)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ExcludeSemantics(
                  child: Container(
                    margin: const EdgeInsets.only(top: 2),
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected ? AppColors.limeLight : Colors.transparent,
                      border: Border.all(color: selected ? AppColors.limeLight : AppColors.white30A(0.6)),
                    ),
                    child: selected ? const Icon(LucideIcons.check, size: 14, color: AppColors.noirEclipse) : null,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A pill toggle for quick answers (`Chip`). [filled] picks the solid
/// lime style (sign-up) or the outlined one (profile editor).
class FgChip extends StatelessWidget {
  const FgChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.filled = true,
    this.height = 36,
    this.width,
    this.semanticLabel,
    this.icon,
    this.radius = 999,
    this.fontSize = 14,
    this.fontWeight = FontWeight.w500,
    this.unselectedBackground,
    this.unselectedText = AppColors.white,
    this.alignment = Alignment.center,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool filled;
  final double height;
  final double? width;
  final String? semanticLabel;
  final IconData? icon;
  final double radius;
  final double fontSize;
  final FontWeight fontWeight;
  final Color? unselectedBackground;
  final Color unselectedText;
  final AlignmentGeometry alignment;

  @override
  Widget build(BuildContext context) {
    final bg = selected ? (filled ? AppColors.limeLight : AppColors.limeLight.withValues(alpha: 0.15)) : (unselectedBackground ?? AppColors.whiteA(0.03));
    final border = selected ? AppColors.limeLight : AppColors.white30A(0.3);
    final textColor = selected ? (filled ? AppColors.noirEclipse : AppColors.white) : unselectedText;
    final chip = Semantics(
      button: true,
      selected: selected,
      label: semanticLabel,
      excludeSemantics: semanticLabel != null,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius), side: BorderSide(color: border)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            height: height,
            width: width,
            padding: EdgeInsets.symmetric(horizontal: width == null ? 14 : 0),
            // Sized to its label, not to the space around it.
            child: Align(
              alignment: alignment,
              widthFactor: width == null ? 1 : null,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[Icon(icon, size: 14, color: textColor), const SizedBox(width: 6)],
                  // One line, shrunk to fit if the chip is too narrow.
                  Flexible(child: FittedBox(fit: BoxFit.scaleDown, child: Text(label, maxLines: 1, softWrap: false, style: fg(size: fontSize, weight: fontWeight, color: textColor)))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    return height < 48 ? TapPadding(child: chip) : chip;
  }
}

/// Two or more options in one segmented control (`Segmented`).
class Segmented<T> extends StatelessWidget {
  const Segmented({super.key, required this.options, required this.value, required this.onChanged, this.label, this.expand = false, this.height = 36, this.fontSize = 14, this.background = AppColors.noirEclipse, this.radius = 8});
  final List<(T, String)> options;
  final T value;
  final ValueChanged<T> onChanged;
  final String? label;
  final bool expand;
  final double height;
  final double fontSize;
  final Color background;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final touchHeight = height + 8 < 48 ? 48.0 : height + 8;
    final buttons = [
      for (final (id, text) in options)
        Builder(builder: (context) {
          final on = id == value;
          // Each segment's touch area spans the control's full height, at
          // least 48px; the highlighted pill inside keeps the site's size.
          final button = Semantics(
            button: true,
            selected: on,
            child: InkWell(
              borderRadius: BorderRadius.circular(radius - 2),
              onTap: () => onChanged(id),
              child: Container(
                height: touchHeight,
                alignment: Alignment.center,
                child: Container(
                  height: height,
                  constraints: const BoxConstraints(minWidth: 48),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: on ? AppColors.limeLight : Colors.transparent, borderRadius: BorderRadius.circular(radius - 2)),
                  child: FittedBox(fit: BoxFit.scaleDown, child: Text(text, maxLines: 1, softWrap: false, style: fg(size: fontSize, weight: on ? FontWeight.w700 : FontWeight.w500, color: on ? AppColors.noirEclipse : AppColors.white70))),
                ),
              ),
            ),
          );
          return expand ? Expanded(child: button) : button;
        }),
    ];
    return Semantics(
      label: label,
      container: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(radius), border: Border.all(color: AppColors.white30A(0.3))),
        child: Material(
          type: MaterialType.transparency,
          child: Row(mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min, children: buttons),
        ),
      ),
    );
  }
}

/// A dropdown (`<select>`), styled like the site's.
class FgSelect<T> extends StatelessWidget {
  const FgSelect({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.radius = 12,
    this.fill = AppColors.noirEclipse,
    this.fontSize = 14,
    this.semanticLabel,
    this.dense = false,
  });

  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;
  final double radius;
  final Color fill;
  final double fontSize;
  final String? semanticLabel;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: fill, borderRadius: BorderRadius.circular(radius), border: Border.all(color: AppColors.white30A(0.3))),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<T>(
            value: options.any((o) => o.$1 == value) ? value : null,
            isExpanded: true,
            isDense: dense,
            dropdownColor: AppColors.obsidianWave,
            borderRadius: BorderRadius.circular(12),
            iconEnabledColor: AppColors.white70,
            style: fg(size: fontSize),
            items: [for (final (v, text) in options) DropdownMenuItem<T>(value: v, child: Text(text, overflow: TextOverflow.ellipsis, style: fg(size: fontSize)))],
            onChanged: (v) {
              if (v != null || null is T) onChanged(v as T);
            },
          ),
        ),
      ),
    );
  }
}

/// A labelled checkbox row (`<label><input type="checkbox"/></label>`).
class CheckRow extends StatelessWidget {
  const CheckRow({super.key, required this.value, required this.onChanged, required this.title, this.subtitle});
  final bool value;
  final ValueChanged<bool> onChanged;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.whiteA(0.05),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.white30A(0.15))),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => onChanged(!value),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: fg(size: 14, weight: FontWeight.w700)),
                    if (subtitle != null) Text(subtitle!, style: fg(size: 14, color: AppColors.white70)),
                  ],
                ),
              ),
              Checkbox(value: value, onChanged: (v) => onChanged(v ?? false)),
            ],
          ),
        ),
      ),
    );
  }
}
